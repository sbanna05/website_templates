<script setup>
// Brand, mode switch, history and the primary action (export).
import { MODES } from '../config/catalog'
import { useStudio } from '../composables/useStudio'
import AppIcon from './AppIcon.vue'

defineEmits(['open-data', 'open-shortcuts'])

const studio = useStudio()
const { state, canUndo, canRedo, exporting } = studio
</script>

<template>
  <header class="topbar">
    <div class="bar glass brand">
      <svg class="brand-mark" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <path d="M16 3 28 9.5v13L16 29 4 22.5v-13L16 3Z" fill="#2f5d62" />
        <path d="M16 16 28 9.5v13L16 29V16Z" fill="#1d3d41" />
        <path d="M16 3 28 9.5 16 16 4 9.5 16 3Z" fill="#a9c7ae" />
      </svg>
      <h1 class="brand-name">Design For You</h1>
    </div>

    <div class="bar glass">
      <div class="segmented" role="group" aria-label="What you are designing">
        <button
          v-for="mode in MODES"
          :key="mode.id"
          type="button"
          :aria-pressed="state.mode === mode.id"
          @click="studio.setMode(mode.id)"
        >
          {{ mode.label }}
        </button>
      </div>
    </div>

    <div class="bar glass tools">
      <button
        type="button"
        class="icon-btn"
        aria-label="Undo"
        title="Undo (Ctrl+Z)"
        :disabled="!canUndo"
        @click="studio.undo"
      >
        <AppIcon name="undo" />
      </button>
      <button
        type="button"
        class="icon-btn"
        aria-label="Redo"
        title="Redo (Ctrl+Shift+Z)"
        :disabled="!canRedo"
        @click="studio.redo"
      >
        <AppIcon name="redo" />
      </button>

      <span class="bar-divider"></span>

      <button
        type="button"
        class="icon-btn"
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (?)"
        @click="$emit('open-shortcuts')"
      >
        <AppIcon name="keyboard" />
      </button>
      <button
        type="button"
        class="icon-btn"
        aria-label="Privacy, data and licences"
        title="Privacy, data and licences"
        @click="$emit('open-data')"
      >
        <AppIcon name="shield" />
      </button>

      <button
        type="button"
        class="btn btn-primary export"
        :disabled="exporting"
        :aria-busy="exporting"
        @click="studio.exportImage"
      >
        <span v-if="exporting" class="spinner export-spinner"></span>
        <AppIcon v-else name="download" :size="18" />
        <span class="export-label">{{ exporting ? 'Rendering' : 'Export image' }}</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
  left: var(--space-4);
  z-index: 3;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  pointer-events: none;
}

.topbar > * {
  pointer-events: auto;
}

.brand {
  gap: var(--space-2);
  min-height: 50px;
  padding-inline: var(--space-3) var(--space-4);
}

.brand-name {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 560;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.segmented button {
  min-width: 88px;
}

.export {
  min-height: 38px;
  margin-left: var(--space-2);
  padding-inline: var(--space-4);
  /* bar radius 16 - padding 6 */
  border-radius: var(--radius-bar-item);
  font-size: 14px;
}

.export-spinner {
  border-color: rgba(18, 32, 26, 0.3);
  border-top-color: var(--accent-ink);
}

@media (max-width: 900px) {
  .topbar {
    top: var(--space-2);
    right: var(--space-2);
    left: var(--space-2);
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .brand-name {
    display: none;
  }

  .brand {
    padding-inline: var(--space-3);
  }

  .segmented button {
    min-width: 72px;
  }

  .tools {
    margin-left: auto;
  }
}

@media (max-width: 520px) {
  .export-label {
    display: none;
  }

  .export {
    padding-inline: var(--space-3);
  }
}
</style>
