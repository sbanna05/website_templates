<script setup>
// A modal built on the native <dialog>, which traps focus, closes on Escape
// and returns focus to the button that opened it.
import { ref, useId, watch } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  open: { type: Boolean, required: true },
  title: { type: String, required: true }
})
const emit = defineEmits(['close'])

const dialogEl = ref(null)
const titleId = useId()

watch(() => props.open, (open) => {
  const dialog = dialogEl.value
  if (!dialog) return
  if (open && !dialog.open) dialog.showModal()
  else if (!open && dialog.open) dialog.close()
}, { flush: 'post' })

/** A click on the backdrop lands on the <dialog> itself, outside its content box. */
function onBackdropClick(event) {
  if (event.target === dialogEl.value) emit('close')
}
</script>

<template>
  <dialog
    ref="dialogEl"
    class="dialog glass"
    :aria-labelledby="titleId"
    @close="emit('close')"
    @click="onBackdropClick"
  >
    <div class="dialog-body">
      <header class="dialog-head">
        <h2 :id="titleId" class="headline">{{ title }}</h2>
        <button type="button" class="icon-btn" aria-label="Close" @click="emit('close')">
          <AppIcon name="close" />
        </button>
      </header>
      <div class="dialog-content">
        <slot />
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.dialog {
  width: min(640px, calc(100vw - 32px));
  max-height: min(760px, calc(100dvh - 32px));
  padding: 0;
  overflow: hidden;
  border-radius: var(--radius-panel);
  background: rgba(24, 28, 32, 0.92);
  color: var(--text);
}

.dialog[open] {
  display: flex;
  animation: dialog-in var(--medium) var(--ease);
}

.dialog::backdrop {
  background: rgba(8, 10, 12, 0.6);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
}

.dialog-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: var(--space-5);
}

.dialog-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.dialog-content {
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--line-strong) transparent;
}

@keyframes dialog-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
}
</style>
