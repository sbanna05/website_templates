// Shared drag-and-drop payload helpers for every color/texture swatch.
//
// Everything is encoded as JSON inside the standard 'text/plain' MIME type
// rather than a custom one (e.g. 'application/x-color'). Custom MIME types
// are read inconsistently across browsers on `drop` — 'text/plain' is
// universally supported, so this is the reliable choice.
//
// A `signature` field guards against treating some unrelated dragged text
// (e.g. a stray text selection) as one of our swatches.

const MIME = 'text/plain'
const SIGNATURE = 'design-studio-swatch'

export function startColorDrag(event, hex, source = 'palette') {
  event.dataTransfer.setData(MIME, JSON.stringify({ signature: SIGNATURE, kind: 'color', value: hex, source }))
  event.dataTransfer.effectAllowed = 'copy'
}

export function startTextureDrag(event, url) {
  event.dataTransfer.setData(MIME, JSON.stringify({ signature: SIGNATURE, kind: 'texture', value: url }))
  event.dataTransfer.effectAllowed = 'copy'
}

/**
 * Reads a drop event back into { kind: 'color' | 'texture', value, source? },
 * or null if this drop wasn't one of our swatches.
 */
export function readDragPayload(event) {
  const raw = event.dataTransfer.getData(MIME)
  if (!raw) return null
  try {
    const payload = JSON.parse(raw)
    if (payload?.signature === SIGNATURE && payload.value) return payload
  } catch {
    // Not JSON, or not ours — ignore silently.
  }
  return null
}
