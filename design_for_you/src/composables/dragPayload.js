// Drag-and-drop payloads for colour swatches, material swatches and
// catalogue blocks.
//
// The payload is JSON inside 'text/plain': custom MIME types are read
// inconsistently across browsers on `drop`, while 'text/plain' always works.
// The `signature` stops unrelated dragged text being mistaken for ours.

const MIME = 'text/plain'
const SIGNATURE = 'design-for-you'

/**
 * @param {DragEvent} event
 * @param {'color' | 'texture' | 'block'} kind
 * @param {string} value a hex colour, a texture id or a block type
 * @param {object} [extra] e.g. `{ given: true }` for colours that should become the working colour
 */
export function startDrag(event, kind, value, extra = {}) {
  event.dataTransfer.setData(MIME, JSON.stringify({ signature: SIGNATURE, kind, value, ...extra }))
  event.dataTransfer.effectAllowed = 'copy'
}

/** Reads a drop back into `{ kind, value, ... }`, or null if it is not one of ours. */
export function readDrag(event) {
  try {
    const payload = JSON.parse(event.dataTransfer.getData(MIME))
    return payload?.signature === SIGNATURE && payload.value ? payload : null
  } catch {
    return null
  }
}
