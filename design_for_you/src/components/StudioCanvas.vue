<script setup>
// Hosts the 3D engine and translates pointer drops and key presses on the
// scene into store actions.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { MODES, getDefinition } from '../config/catalog'
import { readDrag } from '../composables/dragPayload'
import { useStudio } from '../composables/useStudio'
import { StudioEngine } from '../studio/engine'

const studio = useStudio()
const { state, blocks, placedBlocks, selected } = studio

const canvasEl = ref(null)
const status = ref('loading') // 'loading' | 'ready' | 'failed'
const isDropTarget = ref(false)

const NUDGE = 0.05
const NUDGE_LARGE = 0.25
const TURN = 15
const ORBIT_STEP = Math.PI / 24

/** Text alternative for the canvas: what a sighted user would see in the scene. */
const sceneDescription = computed(() => {
  const noun = MODES.find((mode) => mode.id === state.mode).noun
  const names = placedBlocks.value.map((block) => getDefinition(block.type).name.toLowerCase())
  if (!names.length) return `An empty ${noun}. Add blocks from the library.`
  const chosen = selected.value ? ` ${getDefinition(selected.value.type).name} is selected.` : ''
  return `A ${noun} with ${names.length} ${names.length === 1 ? 'block' : 'blocks'}: ${names.join(', ')}.${chosen}`
})

onMounted(() => {
  try {
    const engine = new StudioEngine(canvasEl.value, {
      onSelect: studio.select,
      onDragMove: studio.moveBlock,
      onDragEnd: studio.commit,
      onZoom: (percent) => { studio.zoom.value = percent }
    })
    engine.setMode(state.mode, { animate: false })
    engine.snap = state.snap
    engine.sync(blocks.value, state.selectedId)
    studio.engine.value = engine
    // Wait for the first painted frame before lifting the loading state.
    requestAnimationFrame(() => { status.value = 'ready' })
  } catch (error) {
    console.error('The 3D engine could not start:', error)
    status.value = 'failed'
  }
})

onBeforeUnmount(() => {
  studio.engine.value?.dispose()
  studio.engine.value = null
})

watch(
  [blocks, () => state.selectedId],
  () => studio.engine.value?.sync(blocks.value, state.selectedId),
  { deep: true }
)
watch(() => state.snap, (snap) => {
  if (studio.engine.value) studio.engine.value.snap = snap
})

// ---- Drag and drop from the library ------------------------------------

function onDrop(event) {
  isDropTarget.value = false
  const payload = readDrag(event)
  const engine = studio.engine.value
  if (!payload || !engine) return

  const { id, floor } = engine.pick(event)
  if (payload.kind === 'block') {
    studio.addBlock(payload.value, floor)
  } else if (!id) {
    studio.announce('Drop colours and materials onto a block.')
  } else if (payload.kind === 'color') {
    studio.applyColor(payload.value, { id, given: Boolean(payload.given) })
  } else {
    studio.applyTexture(payload.value, { id })
  }
}

// ---- Keyboard ------------------------------------------------------------

function selectNeighbour(step) {
  const list = placedBlocks.value
  if (!list.length) return
  const index = list.findIndex((block) => block.id === state.selectedId)
  const next = list[(index + step + list.length) % list.length] ?? list[0]
  studio.select(next.id)
  studio.announce(`${getDefinition(next.type).name} selected`)
}

function onKeydown(event) {
  const block = selected.value
  const movable = block && !block.fixed
  const step = event.shiftKey ? NUDGE_LARGE : NUDGE
  const arrows = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1]
  }

  if (arrows[event.key]) {
    const [dx, dz] = arrows[event.key]
    if (movable) studio.nudgeBlock(block.id, dx * step, dz * step)
    else studio.view.orbit(-dx * ORBIT_STEP, dz * ORBIT_STEP)
  } else if (event.key === '[' && movable) {
    studio.rotateBlock(block.id, block.rot - TURN)
  } else if (event.key === ']' && movable) {
    studio.rotateBlock(block.id, block.rot + TURN)
  } else if ((event.key === 'Delete' || event.key === 'Backspace') && movable) {
    studio.removeBlock(block.id)
  } else if (event.key.toLowerCase() === 'd' && (event.ctrlKey || event.metaKey) && movable) {
    studio.duplicateBlock(block.id)
  } else if (event.key === 'Escape' && block) {
    studio.select(null)
    studio.announce('Selection cleared')
  } else if (event.key === 'PageDown') {
    selectNeighbour(1)
  } else if (event.key === 'PageUp') {
    selectNeighbour(-1)
  } else if (event.key === '+' || event.key === '=') {
    studio.view.zoomIn()
  } else if (event.key === '-') {
    studio.view.zoomOut()
  } else if (event.key === '0') {
    studio.view.reset()
  } else {
    return
  }
  event.preventDefault()
}
</script>

<template>
  <div
    class="stage"
    :class="{ 'is-drop-target': isDropTarget }"
    @dragenter.prevent="isDropTarget = true"
    @dragover.prevent
    @dragleave="isDropTarget = $event.currentTarget.contains($event.relatedTarget)"
    @drop.prevent="onDrop"
  >
    <canvas
      ref="canvasEl"
      class="stage-canvas"
      tabindex="0"
      role="application"
      aria-label="3D scene"
      aria-describedby="scene-description scene-keys"
      @keydown="onKeydown"
    ></canvas>

    <p id="scene-description" class="visually-hidden">{{ sceneDescription }}</p>
    <p id="scene-keys" class="visually-hidden">
      Page Down and Page Up choose a block. Arrow keys move it, square brackets turn it,
      Delete removes it. With nothing selected, arrow keys orbit the view. Plus and minus zoom.
    </p>

    <div v-if="status === 'loading'" class="stage-status" role="status">
      <span class="spinner"></span>
      Setting up the studio
    </div>

    <div v-else-if="status === 'failed'" class="stage-status stage-failed glass" role="alert">
      <h2 class="headline">3D could not start in this browser</h2>
      <p>
        The studio needs WebGL. Turn on hardware acceleration in your browser settings,
        or open this page in a current version of Chrome, Edge, Firefox or Safari.
      </p>
    </div>
  </div>
</template>

<style scoped>
.stage {
  position: absolute;
  inset: 0;
}

.stage::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 3px solid var(--accent);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--fast);
}

.stage.is-drop-target::after {
  opacity: 1;
}

.stage-canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}

.stage-canvas:focus-visible {
  outline-offset: -3px;
}

.stage-status {
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

.stage-failed {
  flex-direction: column;
  align-items: flex-start;
  max-width: min(420px, calc(100vw - 32px));
  padding: var(--space-5);
  border-radius: var(--radius-panel);
  color: var(--text);
}
</style>
