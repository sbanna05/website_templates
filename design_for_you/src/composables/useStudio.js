// The studio's single source of truth: both scenes, the selection, undo
// history and saving. Components read `studio.state` and call the actions
// below; the 3D engine only mirrors this state.
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import { MODES, createBlock, createDefaultScene, getDefinition } from '../config/catalog'
import { DEFAULT_BASE_COLOR } from '../config/palettes'
import { textureById } from '../config/textures'
import { parseHex } from '../studio/color'
import { clampToStage, snapToGrid } from '../studio/stage'
import { readStored, removeStored, writeStored } from './storage'

const HISTORY_LIMIT = 60
const MAX_ELEVATION = 2.6
const PAINT_KEYS = ['color', 'texture', 'textureScale', 'finish']
const modeIds = MODES.map((mode) => mode.id)

// ---- Loading saved work -------------------------------------------------

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value)

function isValidBlock(block) {
  return Boolean(
    block && typeof block.id === 'string' && getDefinition(block.type) &&
    ['x', 'y', 'z', 'rot', 'w', 'h', 'd', 'textureScale'].every((key) => isFiniteNumber(block[key])) &&
    parseHex(block.color) && (block.texture === null || textureById[block.texture])
  )
}

/** Rebuilds a saved scene defensively, so a corrupt or outdated save can never break the app. */
function restoreScene(mode, saved) {
  const fresh = createDefaultScene(mode)
  if (!Array.isArray(saved)) return fresh

  const valid = saved.filter(isValidBlock)
  const fixed = fresh.filter((block) => block.fixed).map((block) => {
    const savedPaint = valid.find((candidate) => candidate.id === block.id)
    return savedPaint ? { ...block, ...Object.fromEntries(PAINT_KEYS.map((key) => [key, savedPaint[key]])) } : block
  })
  const placed = valid
    .filter((block) => !getDefinition(block.type).position)
    .map((block) => ({ ...createBlock(block.type, block.id), ...block, fixed: undefined }))
  return [...fixed, ...placed]
}

function loadScenes() {
  const saved = readStored('design', {})
  return Object.fromEntries(modeIds.map((mode) => [mode, restoreScene(mode, saved?.[mode])]))
}

const prefs = readStored('prefs', {}) ?? {}

const state = reactive({
  mode: modeIds.includes(prefs.mode) ? prefs.mode : 'interior',
  scenes: loadScenes(),
  selectedId: null,
  snap: prefs.snap !== false,
  /** The working colour: the base for tints, shades and harmony suggestions. */
  baseColor: parseHex(prefs.baseColor ?? '') ?? DEFAULT_BASE_COLOR
})

const blocks = computed(() => state.scenes[state.mode])
const placedBlocks = computed(() => blocks.value.filter((block) => !block.fixed))
const selected = computed(() => blocks.value.find((block) => block.id === state.selectedId) ?? null)

const findBlock = (id) => blocks.value.find((block) => block.id === id) ?? null
const nameOf = (block) => getDefinition(block.type).name

// ---- Screen-reader announcements ----------------------------------------

const announcement = ref('')
function announce(message) {
  // Re-announcing identical text needs a change, so alternate a trailing space.
  announcement.value = announcement.value === message ? `${message} ` : message
}

// ---- Saving and history ---------------------------------------------------

let persistEnabled = true
const undoStack = ref([])
const redoStack = ref([])
let savedSnapshot = JSON.stringify(state.scenes)
const saveFailed = ref(false)

/** Records the current scenes as one undo step and saves them. Call after each finished edit. */
function commit() {
  const snapshot = JSON.stringify(state.scenes)
  if (snapshot === savedSnapshot) return
  undoStack.value.push(savedSnapshot)
  if (undoStack.value.length > HISTORY_LIMIT) undoStack.value.shift()
  redoStack.value = []
  savedSnapshot = snapshot
  saveFailed.value = !writeStored('design', state.scenes)
}

function restoreSnapshot(snapshot) {
  state.scenes = JSON.parse(snapshot)
  savedSnapshot = snapshot
  if (!findBlock(state.selectedId)) state.selectedId = null
  saveFailed.value = !writeStored('design', state.scenes)
}

function undo() {
  if (!undoStack.value.length) return
  redoStack.value.push(savedSnapshot)
  restoreSnapshot(undoStack.value.pop())
  announce('Undone')
}

function redo() {
  if (!redoStack.value.length) return
  undoStack.value.push(savedSnapshot)
  restoreSnapshot(redoStack.value.pop())
  announce('Redone')
}

watch(
  () => [state.mode, state.snap, state.baseColor],
  ([mode, snap, baseColor]) => {
    if (persistEnabled) writeStored('prefs', { mode, snap, baseColor })
  },
  { flush: 'sync' }
)

// ---- Selection and mode ---------------------------------------------------

function select(id) {
  state.selectedId = id && findBlock(id) ? id : null
}

function setMode(mode) {
  if (mode === state.mode || !modeIds.includes(mode)) return
  state.mode = mode
  state.selectedId = null
  engine.value?.setMode(mode)
}

// ---- Editing blocks -------------------------------------------------------

let idCounter = 0
const newId = (type) => `${type}-${Date.now().toString(36)}-${(idCounter += 1)}`

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const normaliseAngle = (degrees) => ((degrees % 360) + 360) % 360

function place(block, x, z) {
  const position = clampToStage(block, x, z, state.mode)
  block.x = position.x
  block.z = position.z
}

/** A spot for a new block that is not exactly on top of another one. */
function freeSpot(definition) {
  let [x, z] = definition.spawn ?? (state.mode === 'interior' ? [0.6, 0.9] : [0, 0])
  // Garments are meant to stack on the mannequin, so only furniture is spread out.
  if (state.mode === 'interior') {
    const taken = (px, pz) => placedBlocks.value.some((b) => Math.hypot(b.x - px, b.z - pz) < 0.1)
    for (let attempt = 0; attempt < 12 && taken(x, z); attempt += 1) x += 0.35
  }
  return [x, z]
}

/** Adds a catalogue block, at `point` when given (a drop on the floor), and selects it. */
function addBlock(type, point = null) {
  const definition = getDefinition(type)
  const block = createBlock(type, newId(type))
  const [x, z] = point ? [point.x, point.z] : freeSpot(definition)
  place(block, state.snap ? snapToGrid(x) : x, state.snap ? snapToGrid(z) : z)
  blocks.value.push(block)
  state.selectedId = block.id
  commit()
  announce(`${definition.name} added`)
  return block.id
}

function removeBlock(id) {
  const block = findBlock(id)
  if (!block || block.fixed) return
  blocks.value.splice(blocks.value.indexOf(block), 1)
  if (state.selectedId === id) state.selectedId = null
  commit()
  announce(`${nameOf(block)} deleted. Press Control Z to undo.`)
}

function duplicateBlock(id) {
  const block = findBlock(id)
  if (!block || block.fixed) return
  const copy = { ...block, id: newId(block.type) }
  place(copy, block.x + 0.3, block.z + 0.3)
  blocks.value.push(copy)
  state.selectedId = copy.id
  commit()
  announce(`${nameOf(block)} duplicated`)
}

/** Live position update while dragging. Does not create an undo step; call `commit()` on release. */
function moveBlock(id, x, z) {
  const block = findBlock(id)
  if (block && !block.fixed) place(block, x, z)
}

function nudgeBlock(id, dx, dz) {
  const block = findBlock(id)
  if (!block || block.fixed) return
  place(block, block.x + dx, block.z + dz)
  commit()
  announce(`${nameOf(block)} at ${Math.round(block.x * 100)}, ${Math.round(block.z * 100)} centimetres`)
}

function rotateBlock(id, degrees, { live = false } = {}) {
  const block = findBlock(id)
  if (!block || block.fixed) return
  block.rot = normaliseAngle(degrees)
  place(block, block.x, block.z)
  if (!live) {
    commit()
    announce(`${nameOf(block)} turned to ${Math.round(block.rot)} degrees`)
  }
}

/** Sets width, height or depth in metres, held within the block's limits. */
function resizeBlock(id, axis, metres, { live = false } = {}) {
  const block = findBlock(id)
  const limits = block && getDefinition(block.type).limits
  if (!limits || block.fixed) return
  block[axis] = clamp(Math.round(metres * 100) / 100, ...limits[axis])
  place(block, block.x, block.z)
  if (!live) commit()
}

function setElevation(id, metres, { live = false } = {}) {
  const block = findBlock(id)
  if (!block || block.fixed) return
  block.y = clamp(Math.round(metres * 100) / 100, 0, MAX_ELEVATION)
  if (!live) commit()
}

// ---- Paint ----------------------------------------------------------------

/**
 * Paints a block. Without `id` the selected block is used.
 * `given` colours (palette, picker and harmony swatches) also become the
 * working colour; mixed tints and shades do not, or the mixer would drift
 * further from its base with every click.
 */
function applyColor(hex, { id = state.selectedId, given = false } = {}) {
  const color = parseHex(hex)
  if (!color) return
  if (given) state.baseColor = color
  const block = findBlock(id)
  if (!block) return
  block.color = color
  commit()
  announce(`${nameOf(block)} painted ${color}`)
}

const loadingTexture = ref(null)
const textureError = ref(null)

/** Applies a material (or removes it with null) once its image is ready. */
async function applyTexture(textureId, { id = state.selectedId } = {}) {
  const block = findBlock(id)
  if (!block) return
  textureError.value = null

  if (textureId) {
    loadingTexture.value = textureId
    try {
      // Loaded on demand so three.js stays out of the first download.
      const { loadTexture } = await import('../studio/textureStore')
      await loadTexture(textureId)
    } catch {
      textureError.value = `${textureById[textureId].name} could not be loaded. Check your connection and try again.`
      return
    } finally {
      if (loadingTexture.value === textureId) loadingTexture.value = null
    }
  }

  // The block may have been deleted while the image loaded.
  const target = findBlock(id)
  if (!target) return
  target.texture = textureId
  commit()
  announce(textureId ? `${textureById[textureId].name} applied to ${nameOf(target)}` : `Material removed from ${nameOf(target)}`)
}

function setPaint(id, patch, { live = false } = {}) {
  const block = findBlock(id)
  if (!block) return
  Object.assign(block, patch)
  if (!live) commit()
}

// ---- Reset and deletion -----------------------------------------------------

/** Puts the current mode back to its starting scene. Undoable. */
function resetScene() {
  state.scenes[state.mode] = createDefaultScene(state.mode)
  state.selectedId = null
  commit()
  announce('Scene reset to the starting layout')
}

/** Erases saved scenes and their undo history from this browser. Not undoable. */
function deleteDesignData() {
  state.scenes = Object.fromEntries(modeIds.map((mode) => [mode, createDefaultScene(mode)]))
  state.selectedId = null
  undoStack.value = []
  redoStack.value = []
  savedSnapshot = JSON.stringify(state.scenes)
  removeStored('design')
}

function deletePreferences() {
  persistEnabled = false
  state.snap = true
  state.baseColor = DEFAULT_BASE_COLOR
  persistEnabled = true
  removeStored('prefs')
}

// ---- The 3D view ------------------------------------------------------------

const engine = shallowRef(null)
const zoom = ref(100)
const exporting = ref(false)

const view = {
  zoomIn: () => engine.value?.zoomBy(1.25),
  zoomOut: () => engine.value?.zoomBy(0.8),
  reset: () => engine.value?.resetView(),
  top: () => engine.value?.topView(),
  orbit: (azimuth, polar) => engine.value?.orbitBy(azimuth, polar)
}

/** Renders a high-resolution PNG of the current view and downloads it. */
async function exportImage() {
  if (!engine.value || exporting.value) return
  exporting.value = true
  try {
    const blob = await engine.value.snapshot()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `design-for-you-${state.mode}.png`
    link.click()
    URL.revokeObjectURL(url)
    announce('Image exported')
  } catch {
    announce('The image could not be exported. Try again.')
  } finally {
    exporting.value = false
  }
}

export function useStudio() {
  return {
    state,
    blocks,
    placedBlocks,
    selected,
    announcement,
    announce,
    saveFailed,
    canUndo: computed(() => undoStack.value.length > 0),
    canRedo: computed(() => redoStack.value.length > 0),
    undo,
    redo,
    commit,
    select,
    setMode,
    addBlock,
    removeBlock,
    duplicateBlock,
    moveBlock,
    nudgeBlock,
    rotateBlock,
    resizeBlock,
    setElevation,
    applyColor,
    applyTexture,
    setPaint,
    loadingTexture,
    textureError,
    resetScene,
    deleteDesignData,
    deletePreferences,
    engine,
    zoom,
    view,
    exporting,
    exportImage
  }
}
