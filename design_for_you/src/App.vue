<script setup>
import { ref, reactive, computed, watch } from 'vue'
import * as THREE from 'three'
import { sceneConfig, palettes } from './config/sceneObjects'
import { useResizable } from './composables/useResizable'

import TargetPicker from './components/TargetPicker.vue'
import PaletteSwatches from './components/PaletteSwatches.vue'
import ColorMixer from './components/ColorMixer.vue'
import MaterialSwatches from './components/MaterialSwatches.vue'
import ModelLibraryPanel from './components/ModelLibraryPanel.vue'
import ModelViewport from './components/ModelViewport.vue'

// ---- Mode + target selection -------------------------------------------
const appMode = ref('interior')
const items = computed(() => sceneConfig[appMode.value])
const activeTarget = ref(items.value[0].id)

watch(appMode, () => {
  activeTarget.value = items.value[0].id
})

// ---- Palette --------------------------------------------------------------
const activePaletteName = ref('vibrant')

// ---- Tint/Shade/Tone mixer base color --------------------------------------
// Deliberately its OWN piece of state, independent of any object's applied
// color. It only ever changes when the user picks a "given" color — a
// palette swatch, or the native color picker inside the mixer itself.
// Applying a *mixed* result to an object must never feed back into this,
// or every click would shift the base and the mixer would drift with each
// use. See ColorMixer.vue and onApplyMixedColor/onDropColor below.
const mixerBaseColor = ref(palettes.vibrant[0])

// ---- Per-object styling -----------------------------------------------------
const textureLoader = new THREE.TextureLoader()

function buildDefaultStyles() {
  const map = {}
  for (const mode of Object.keys(sceneConfig)) {
    for (const item of sceneConfig[mode]) {
      map[item.id] = { color: item.defaultColor, texture: null }
    }
  }
  return map
}
// `color` and `texture` are independent: setting one never clears the
// other, so a color always tints whatever texture (if any) is applied.
const objectStyles = reactive(buildDefaultStyles())

function applyColorTo(id, hex) {
  objectStyles[id] = { ...objectStyles[id], color: hex }
}

function applyTextureTo(id, imageUrl) {
  textureLoader.load(imageUrl, (loaded) => {
    loaded.wrapS = THREE.RepeatWrapping
    loaded.wrapT = THREE.RepeatWrapping
    loaded.repeat.set(2, 2)
    loaded.colorSpace = THREE.SRGBColorSpace
    objectStyles[id] = { ...objectStyles[id], texture: loaded }
  })
}

// Picking a palette color: paints the active target AND becomes the new
// mixer base, since it's a "given" color.
function onApplyPaletteColor(hex) {
  applyColorTo(activeTarget.value, hex)
  mixerBaseColor.value = hex
}

// Picking a mixed (tint/shade/tone) result: paints the active target only.
function onApplyMixedColor(hex) {
  applyColorTo(activeTarget.value, hex)
}

function onApplyTexture(url) {
  applyTextureTo(activeTarget.value, url)
}

// Dragging a swatch can paint any object directly — a card in the target
// list, or the object itself in the 3D view — regardless of what's
// currently selected. `source` (set by the swatch that started the drag)
// decides whether this also updates the mixer base.
function onDropColor({ id, color, source }) {
  applyColorTo(id, color)
  if (source === 'palette') mixerBaseColor.value = color
}

function onDropTexture({ id, texture }) {
  applyTextureTo(id, texture)
}

// ---- Sidebar resize / collapse ---------------------------------------------
const sidebarCollapsed = ref(false)
const { width: sidebarWidth, isResizing, startResize } = useResizable({
  initial: 400,
  min: 320,
  max: 640
})
</script>

<template>
  <div class="designer-layout">
    <div class="mode-switcher">
      <button
        :class="['mode-btn', { active: appMode === 'interior' }]"
        @click="appMode = 'interior'"
      >
        Interior Design
      </button>
      <button
        :class="['mode-btn', { active: appMode === 'clothing' }]"
        @click="appMode = 'clothing'"
      >
        Clothing
      </button>
    </div>

    <button
      class="collapse-toggle"
      :class="{ collapsed: sidebarCollapsed }"
      :style="{ left: sidebarCollapsed ? '1.5rem' : sidebarWidth + 24 + 'px' }"
      @click="sidebarCollapsed = !sidebarCollapsed"
      :title="sidebarCollapsed ? 'Show panel' : 'Hide panel'"
    >
      {{ sidebarCollapsed ? '›' : '‹' }}
    </button>

    <aside
      class="sidebar"
      :class="{ collapsed: sidebarCollapsed, resizing: isResizing }"
      :style="{ width: sidebarCollapsed ? '0px' : sidebarWidth + 'px' }"
    >
      <div class="sidebar-inner" :style="{ width: sidebarWidth + 'px' }">
        <header class="sidebar-header">
          <h1 class="brand-title">Design <span class="math-italic">Studio</span></h1>
          <p class="subtitle">Customize your {{ appMode === 'interior' ? 'space' : 'style' }}</p>
        </header>

        <div class="sidebar-content">
          <section class="panel">
            <h3 class="panel-title">1. Select Target</h3>
            <TargetPicker
              v-model="activeTarget"
              :options="items"
              @drop-color="onDropColor"
              @drop-texture="onDropTexture"
            />
          </section>

          <section class="panel">
            <h3 class="panel-title">2. Choose Palette</h3>
            <PaletteSwatches
              v-model="activePaletteName"
              :palettes="palettes"
              @apply-color="onApplyPaletteColor"
            />
          </section>

          <section class="panel">
            <h3 class="panel-title">3. Tint · Shade · Tone</h3>
            <ColorMixer
              v-model="mixerBaseColor"
              @apply-color="onApplyMixedColor"
            />
          </section>

          <section class="panel">
            <h3 class="panel-title">4. Apply Materials</h3>
            <MaterialSwatches @apply-texture="onApplyTexture" />
          </section>

          <section class="panel">
            <h3 class="panel-title">5. 3D Models <span class="badge">soon</span></h3>
            <ModelLibraryPanel :items="items" />
          </section>
        </div>
      </div>

      <div
        class="resize-handle"
        @mousedown="startResize"
        title="Drag to resize"
      ></div>
    </aside>

    <main class="canvas-container">
      <ModelViewport
        :items="items"
        :paint-map="objectStyles"
        @drop-color="onDropColor"
        @drop-texture="onDropTexture"
      />
    </main>
  </div>
</template>
