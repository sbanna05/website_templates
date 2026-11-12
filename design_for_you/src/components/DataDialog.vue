<script setup>
// Plain answers to "what does this cost, what do you keep, who else is
// involved, and are these images licensed?", with the delete controls.
import { computed, ref, watch } from 'vue'
import { textures } from '../config/textures'
import { AUDIT_DATE, thirdParty } from '../config/thirdParty'
import { STORAGE_ENTRIES, storedSizes } from '../composables/storage'
import { usePalettes } from '../composables/usePalettes'
import { useStudio } from '../composables/useStudio'
import AppDialog from './AppDialog.vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({ open: { type: Boolean, required: true } })
const emit = defineEmits(['close'])

const studio = useStudio()
const palettes = usePalettes()

const sizes = ref(storedSizes())
/** Which delete is awaiting its second, confirming click ('design', 'all', ...). */
const confirming = ref(null)
const result = ref('')

watch(() => props.open, (open) => {
  if (!open) return
  sizes.value = storedSizes()
  confirming.value = null
  result.value = ''
})

const erasers = {
  design: studio.deleteDesignData,
  palettes: palettes.deleteAllPalettes,
  prefs: studio.deletePreferences
}

const hasSavedData = computed(() => Object.values(sizes.value).some((bytes) => bytes > 0))
const runtimeLibraries = thirdParty.filter((library) => library.runtime)
const buildTools = thirdParty.filter((library) => !library.runtime)

function formatBytes(bytes) {
  if (!bytes) return 'Nothing saved'
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} kB`
}

function erase(id) {
  if (confirming.value !== id) {
    confirming.value = id
    return
  }
  const targets = id === 'all' ? STORAGE_ENTRIES.map((entry) => entry.id) : [id]
  targets.forEach((target) => erasers[target]())
  sizes.value = storedSizes()
  confirming.value = null
  result.value = id === 'all'
    ? 'Everything saved by this site has been deleted from this browser.'
    : `${STORAGE_ENTRIES.find((entry) => entry.id === id).label} deleted from this browser.`
  studio.announce(result.value)
}

const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
</script>

<template>
  <AppDialog :open="open" title="Privacy, data and licences" @close="emit('close')">
    <section class="section">
      <h3 class="section-title">Free, with nothing to buy</h3>
      <p class="copy">
        Every block, colour, material and export is included. There is no account, no trial,
        no watermark and no payment step anywhere in this app.
      </p>
    </section>

    <section class="section">
      <h3 class="section-title">Your work stays in this browser</h3>
      <p class="copy">
        Scenes and palettes are saved on this device only. Nothing is uploaded, and there are
        no cookies, analytics or trackers. Deleting here cannot be undone.
      </p>

      <ul class="data-list">
        <li v-for="entry in STORAGE_ENTRIES" :key="entry.id" class="data-row">
          <div class="data-text">
            <span class="data-label">{{ entry.label }}</span>
            <span class="section-hint">{{ entry.description }}</span>
          </div>
          <span class="data-size num">{{ formatBytes(sizes[entry.id]) }}</span>
          <div class="data-actions">
            <button
              type="button"
              class="btn btn-danger"
              :disabled="!sizes[entry.id]"
              @click="erase(entry.id)"
            >
              <AppIcon name="trash" :size="16" />
              {{ confirming === entry.id ? 'Delete for good' : 'Delete' }}
            </button>
            <button v-if="confirming === entry.id" type="button" class="btn" @click="confirming = null">
              Keep
            </button>
          </div>
        </li>
      </ul>

      <div class="data-all">
        <button type="button" class="btn btn-danger" :disabled="!hasSavedData" @click="erase('all')">
          <AppIcon name="trash" :size="16" />
          {{ confirming === 'all' ? 'Delete everything for good' : 'Delete everything' }}
        </button>
        <button v-if="confirming === 'all'" type="button" class="btn" @click="confirming = null">
          Keep my work
        </button>
      </div>
      <p v-if="result" class="result" role="status">
        <AppIcon name="check" :size="16" />
        {{ result }}
      </p>
    </section>

    <section class="section">
      <h3 class="section-title">No outside services</h3>
      <p class="copy">
        The page makes no requests to other companies while you use it. These open-source
        libraries are bundled into the site itself. Last audited {{ formatDate(AUDIT_DATE) }}.
      </p>
      <table class="table">
        <thead>
          <tr>
            <th scope="col">Library</th>
            <th scope="col">What it does</th>
            <th scope="col">Licence</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="library in runtimeLibraries" :key="library.package">
            <th scope="row">{{ library.name }}</th>
            <td>{{ library.purpose }}</td>
            <td>{{ library.license }}</td>
          </tr>
        </tbody>
      </table>
      <p class="section-hint table-note">
        Build tools that never reach your browser:
        {{ buildTools.map((tool) => `${tool.name} (${tool.license})`).join(', ') }}.
      </p>
    </section>

    <section class="section">
      <h3 class="section-title">Image licences</h3>
      <p class="copy">
        Every material is either drawn by the app or a CC0 public-domain photo, free for
        personal and commercial use with no credit required.
      </p>
      <table class="table">
        <thead>
          <tr>
            <th scope="col">Material</th>
            <th scope="col">Source</th>
            <th scope="col">Licence</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="texture in textures" :key="texture.id">
            <th scope="row">{{ texture.name }}</th>
            <td>
              <a v-if="texture.sourceUrl" :href="texture.sourceUrl" target="_blank" rel="noopener noreferrer">
                {{ texture.source }}, {{ texture.authors }}<span class="visually-hidden"> (opens in a new tab)</span>
              </a>
              <template v-else>{{ texture.authors }}</template>
            </td>
            <td>{{ texture.license }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </AppDialog>
</template>

<style scoped>
.copy {
  max-width: 62ch;
  color: var(--text-soft);
  text-wrap: pretty;
}

.data-list {
  margin: var(--space-3) 0 0;
  padding: 0;
  list-style: none;
}

.data-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-top: 1px solid var(--line);
}

.data-text {
  display: flex;
  flex-direction: column;
}

.data-label {
  font-weight: 650;
}

.data-size {
  font-size: 13px;
  color: var(--text-soft);
  text-align: right;
}

.data-actions,
.data-all {
  display: flex;
  gap: var(--space-2);
}

.data-all {
  padding-top: var(--space-3);
  border-top: 1px solid var(--line);
}

.result {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
  font-weight: 600;
  color: var(--accent-strong);
}

.table {
  width: 100%;
  margin-top: var(--space-3);
  border-collapse: collapse;
  font-size: 13px;
}

.table th,
.table td {
  padding: var(--space-2) var(--space-3) var(--space-2) 0;
  border-top: 1px solid var(--line);
  text-align: left;
  vertical-align: top;
}

.table thead th {
  border-top: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-soft);
}

.table tbody th {
  font-weight: 650;
  white-space: nowrap;
}

.table td:last-child {
  white-space: nowrap;
}

.table-note {
  margin-top: var(--space-2);
}

@media (max-width: 560px) {
  .data-row {
    grid-template-columns: 1fr auto;
  }

  .data-actions {
    grid-column: 1 / -1;
  }
}
</style>
