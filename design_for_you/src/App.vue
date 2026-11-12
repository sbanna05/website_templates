<script setup>
// App shell: lays the glass panels over the full-bleed 3D stage and owns
// the bits of UI state that are not part of the design itself (which tab is
// open, which dialog is showing).
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useStudio } from './composables/useStudio'
import AppIcon from './components/AppIcon.vue'
import BlockCatalog from './components/BlockCatalog.vue'
import ColourPanel from './components/ColourPanel.vue'
import DataDialog from './components/DataDialog.vue'
import InspectorPanel from './components/InspectorPanel.vue'
import MaterialPanel from './components/MaterialPanel.vue'
import ShortcutsDialog from './components/ShortcutsDialog.vue'
import TopBar from './components/TopBar.vue'
import ViewControls from './components/ViewControls.vue'

// The 3D engine is the heaviest part of the app, so it loads in its own
// chunk while the panels are already usable.
const StudioCanvas = defineAsyncComponent(() => import('./components/StudioCanvas.vue'))

const studio = useStudio()

// ---- Layout ---------------------------------------------------------------

// On narrow screens the inspector joins the library as a fourth tab in one
// bottom sheet, instead of taking a second column.
const compactQuery = window.matchMedia('(max-width: 900px)')
const isCompact = ref(compactQuery.matches)
const onCompactChange = (event) => { isCompact.value = event.matches }

const LIBRARY_TABS = [
  { id: 'blocks', label: 'Blocks' },
  { id: 'colours', label: 'Colours' },
  { id: 'materials', label: 'Materials' }
]
const tabs = computed(() => (isCompact.value ? [...LIBRARY_TABS, { id: 'edit', label: 'Edit' }] : LIBRARY_TABS))
const activeTab = ref('blocks')
const sheetOpen = ref(true)
const tabRefs = ref({})

watch(isCompact, (compact) => {
  if (!compact && activeTab.value === 'edit') activeTab.value = 'blocks'
})

function openTab(id) {
  activeTab.value = id
  sheetOpen.value = true
}

/** Arrow keys move between tabs, as the tab pattern expects. */
function onTabKeydown(event) {
  const order = tabs.value.map((tab) => tab.id)
  const index = order.indexOf(activeTab.value)
  const next = {
    ArrowRight: order[(index + 1) % order.length],
    ArrowLeft: order[(index - 1 + order.length) % order.length],
    Home: order[0],
    End: order[order.length - 1]
  }[event.key]
  if (!next) return
  event.preventDefault()
  openTab(next)
  nextTick(() => tabRefs.value[next]?.focus())
}

// ---- Dialogs ----------------------------------------------------------------

const dataOpen = ref(false)
const shortcutsOpen = ref(false)

// ---- Shortcuts that work anywhere -------------------------------------------

function onGlobalKeydown(event) {
  const typing = event.target.closest?.('input, textarea, select, [contenteditable]')
  const command = event.ctrlKey || event.metaKey
  const key = event.key.toLowerCase()

  // Leave Ctrl+Z to the browser while a text field is being edited.
  if (command && key === 'z' && !typing) {
    event.preventDefault()
    if (event.shiftKey) studio.redo()
    else studio.undo()
  } else if (command && key === 'y' && !typing) {
    event.preventDefault()
    studio.redo()
  } else if (event.key === '?' && !typing) {
    shortcutsOpen.value = true
  }
}

onMounted(() => {
  compactQuery.addEventListener('change', onCompactChange)
  window.addEventListener('keydown', onGlobalKeydown)
})

onBeforeUnmount(() => {
  compactQuery.removeEventListener('change', onCompactChange)
  window.removeEventListener('keydown', onGlobalKeydown)
})
</script>

<template>
  <div class="app" :class="{ 'is-compact': isCompact, 'sheet-closed': isCompact && !sheetOpen }">
    <main class="viewport">
      <Suspense>
        <StudioCanvas />
        <template #fallback>
          <div class="viewport-loading" role="status">
            <span class="spinner"></span>
            Loading the 3D studio
          </div>
        </template>
      </Suspense>
    </main>

    <TopBar @open-data="dataOpen = true" @open-shortcuts="shortcutsOpen = true" />

    <aside class="panel glass library" aria-label="Library">
      <div class="library-head">
        <div class="segmented tabs" role="tablist" aria-label="Library" @keydown="onTabKeydown">
          <button
            v-for="tab in tabs"
            :id="`tab-${tab.id}`"
            :key="tab.id"
            :ref="(el) => { tabRefs[tab.id] = el }"
            type="button"
            role="tab"
            :aria-selected="activeTab === tab.id"
            :aria-controls="`tabpanel-${tab.id}`"
            :tabindex="activeTab === tab.id ? 0 : -1"
            @click="openTab(tab.id)"
          >
            {{ tab.label }}
          </button>
        </div>
        <button
          v-if="isCompact"
          type="button"
          class="icon-btn sheet-toggle"
          :aria-expanded="sheetOpen"
          :aria-label="sheetOpen ? 'Hide the library' : 'Show the library'"
          @click="sheetOpen = !sheetOpen"
        >
          <AppIcon name="chevron" />
        </button>
      </div>

      <div v-show="!isCompact || sheetOpen" class="panel-scroll library-body">
        <div v-show="activeTab === 'blocks'" id="tabpanel-blocks" role="tabpanel" aria-labelledby="tab-blocks">
          <BlockCatalog />
        </div>
        <div v-show="activeTab === 'colours'" id="tabpanel-colours" role="tabpanel" aria-labelledby="tab-colours">
          <ColourPanel />
        </div>
        <div v-show="activeTab === 'materials'" id="tabpanel-materials" role="tabpanel" aria-labelledby="tab-materials">
          <MaterialPanel @open-licences="dataOpen = true" />
        </div>
        <div v-if="isCompact" v-show="activeTab === 'edit'" id="tabpanel-edit" role="tabpanel" aria-labelledby="tab-edit">
          <InspectorPanel />
        </div>
      </div>
    </aside>

    <aside v-if="!isCompact" class="panel glass inspector" aria-label="Selected block">
      <div class="panel-scroll">
        <InspectorPanel />
      </div>
    </aside>

    <div class="view-controls">
      <ViewControls />
    </div>

    <p v-if="studio.saveFailed.value" class="save-warning glass" role="alert">
      This browser is blocking saves, so your work will last only until you close the page.
    </p>

    <div class="visually-hidden" role="status" aria-live="polite">{{ studio.announcement.value }}</div>

    <DataDialog :open="dataOpen" @close="dataOpen = false" />
    <ShortcutsDialog :open="shortcutsOpen" @close="shortcutsOpen = false" />
  </div>
</template>

<style scoped>
.app {
  --edge: var(--space-4);
  --top-offset: 82px;
  --sheet-height: 46dvh;

  position: relative;
  height: 100%;
  overflow: hidden;
  /* Stage backdrop: steel grey lit from above, warmed with clay and teal at the corners. */
  background:
    radial-gradient(60% 50% at 10% 92%, rgba(181, 101, 63, 0.22), transparent 70%),
    radial-gradient(55% 50% at 90% 6%, rgba(47, 93, 98, 0.36), transparent 70%),
    radial-gradient(120% 90% at 50% 38%, var(--stage-high) 0%, var(--stage-mid) 48%, var(--stage-low) 100%);
}

.viewport {
  position: absolute;
  inset: 0;
}

.viewport-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  transform: translate(-50%, -50%);
  font-weight: 600;
  color: var(--text-soft);
}

.library,
.inspector {
  position: absolute;
  top: var(--top-offset);
  z-index: 2;
}

.library {
  bottom: var(--edge);
  left: var(--edge);
  width: 332px;
}

.inspector {
  right: var(--edge);
  width: 316px;
  max-height: calc(100% - var(--top-offset) - var(--edge));
}

/* The inspector hugs its content and only scrolls once it runs out of room. */
.inspector .panel-scroll {
  flex: 0 1 auto;
}

.library-head {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.tabs {
  flex: 1;
}

.tabs button {
  padding: 0 var(--space-2);
}

.view-controls {
  position: absolute;
  bottom: var(--edge);
  left: 50%;
  z-index: 2;
  transform: translateX(-50%);
}

.save-warning {
  position: absolute;
  bottom: calc(var(--edge) + 64px);
  left: 50%;
  z-index: 2;
  max-width: min(420px, calc(100% - 32px));
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-bar);
  transform: translateX(-50%);
  font-size: 13px;
  color: var(--danger);
}

/* ---- Narrow screens: one bottom sheet ---------------------------------- */

.is-compact {
  --edge: var(--space-2);
}

.is-compact .viewport {
  /* Clear the top bar, which wraps onto two rows on a phone. */
  top: 104px;
  bottom: calc(var(--sheet-height) + var(--edge));
  transition: bottom var(--medium) var(--ease);
}

.is-compact .library {
  top: auto;
  right: var(--edge);
  width: auto;
  height: var(--sheet-height);
  transition: height var(--medium) var(--ease);
}

.is-compact.sheet-closed {
  --sheet-height: 66px;
}

.is-compact.sheet-closed .library-head {
  margin-bottom: 0;
}

.sheet-toggle svg {
  transition: transform var(--medium) var(--ease);
}

.sheet-closed .sheet-toggle svg {
  transform: rotate(180deg);
}

.is-compact .view-controls {
  bottom: calc(var(--sheet-height) + var(--edge) * 2);
  transition: bottom var(--medium) var(--ease);
}

.is-compact .save-warning {
  bottom: calc(var(--sheet-height) + var(--edge) * 2 + 60px);
}
</style>
