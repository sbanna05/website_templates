<script setup>
import { ref } from 'vue'
import { readDragPayload } from '../composables/useDragPayload'

defineProps({
  options: { type: Array, required: true }, // [{ id, label }]
  modelValue: { type: String, required: true }
})
const emit = defineEmits(['update:modelValue', 'drop-color', 'drop-texture'])

// Tracks which card is currently being dragged over, purely for the
// highlight — also doubles as visible proof the drop zone is registering
// the drag at all, which is handy while testing.
const dragOverId = ref(null)

function onDrop(event, id) {
  dragOverId.value = null
  const payload = readDragPayload(event)
  if (!payload) return
  if (payload.kind === 'color') {
    emit('drop-color', { id, color: payload.value, source: payload.source })
  } else {
    emit('drop-texture', { id, texture: payload.value })
  }
}
</script>

<template>
  <div class="target-list">
    <button
      v-for="opt in options"
      :key="opt.id"
      type="button"
      class="target-card"
      :class="{ active: modelValue === opt.id, 'drag-over': dragOverId === opt.id }"
      @click="emit('update:modelValue', opt.id)"
      @dragenter.prevent="dragOverId = opt.id"
      @dragover.prevent
      @dragleave="dragOverId === opt.id && (dragOverId = null)"
      @drop.prevent="onDrop($event, opt.id)"
    >
      <span class="target-dot" aria-hidden="true"></span>
      <span class="target-label">{{ opt.label }}</span>
      <span class="target-drop-hint">drop to paint</span>
    </button>
  </div>
</template>

<style scoped>
.target-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.target-card {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid rgba(74, 93, 78, 0.15);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.4);
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  color: var(--text-main);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.target-card:hover {
  background: rgba(255, 255, 255, 0.7);
  border-color: var(--accent-green);
}

.target-card.active {
  background: var(--accent-green);
  border-color: var(--accent-green);
  color: #fff;
}

.target-card.active .target-drop-hint { color: rgba(255, 255, 255, 0.7); }

/* Fires while a swatch is dragged over this card — confirms the drop
   zone is live and shows exactly where a drop will land. */
.target-card.drag-over {
  border-color: var(--accent-green);
  border-style: dashed;
  background: rgba(74, 93, 78, 0.14);
  transform: scale(1.02);
}

.target-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.5;
  flex-shrink: 0;
}

.target-label { flex: 1; }

.target-drop-hint {
  font-size: 0.7rem;
  color: var(--text-muted);
  opacity: 0.8;
}
</style>
