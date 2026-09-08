import { ref } from 'vue'

/**
 * Drag-to-resize behavior for a horizontal panel (e.g. the sidebar).
 * Returns a reactive `width`, an `isResizing` flag (useful for disabling
 * CSS transitions while actively dragging), and a `startResize` handler
 * to wire up to a drag-handle's @mousedown.
 */
export function useResizable({ initial = 400, min = 300, max = 640 } = {}) {
  const width = ref(initial)
  const isResizing = ref(false)

  function startResize(event) {
    event.preventDefault()
    isResizing.value = true

    const startX = event.clientX
    const startWidth = width.value

    function onMove(moveEvent) {
      const delta = moveEvent.clientX - startX
      width.value = Math.min(max, Math.max(min, startWidth + delta))
    }

    function onUp() {
      isResizing.value = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return { width, isResizing, startResize }
}
