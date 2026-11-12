// Palettes the user builds and saves. Shared module state, so the Colours
// tab and the Privacy & data dialog always agree.
import { ref } from 'vue'
import { parseHex } from '../studio/color'
import { readStored, removeStored, writeStored } from './storage'

export const MAX_PALETTE_COLORS = 8
const MAX_NAME_LENGTH = 40

function restore(saved) {
  if (!Array.isArray(saved)) return []
  return saved
    .filter((palette) => palette && typeof palette.id === 'string' && typeof palette.name === 'string' && Array.isArray(palette.colors))
    .map((palette) => ({
      id: palette.id,
      name: palette.name.slice(0, MAX_NAME_LENGTH),
      colors: palette.colors.map(parseHex).filter(Boolean).slice(0, MAX_PALETTE_COLORS)
    }))
    .filter((palette) => palette.colors.length)
}

const saved = ref(restore(readStored('palettes', [])))
/** Colours collected for the palette being built. Not saved until named. */
const draft = ref([])
const saveFailed = ref(false)

const persist = () => { saveFailed.value = !writeStored('palettes', saved.value) }

/** Adds a colour to the draft. Returns false when it is a duplicate or the draft is full. */
function addToDraft(hex) {
  const color = parseHex(hex)
  if (!color || draft.value.includes(color) || draft.value.length >= MAX_PALETTE_COLORS) return false
  draft.value.push(color)
  return true
}

function removeFromDraft(index) {
  draft.value.splice(index, 1)
}

/** Saves the draft under `name` and starts a fresh one. Returns the new palette, or null if invalid. */
function saveDraft(name) {
  const trimmed = name.trim().slice(0, MAX_NAME_LENGTH)
  if (!trimmed || !draft.value.length) return null
  const palette = { id: `palette-${Date.now().toString(36)}`, name: trimmed, colors: [...draft.value] }
  saved.value.push(palette)
  draft.value = []
  persist()
  return palette
}

function removePalette(id) {
  saved.value = saved.value.filter((palette) => palette.id !== id)
  persist()
}

/** Erases every saved palette from this browser. */
function deleteAllPalettes() {
  saved.value = []
  draft.value = []
  removeStored('palettes')
}

export function usePalettes() {
  return { saved, draft, saveFailed, addToDraft, removeFromDraft, saveDraft, removePalette, deleteAllPalettes }
}
