<script setup>
// Camera toolbar: zoom, the two fixed views and grid snapping.
import { useStudio } from '../composables/useStudio'
import AppIcon from './AppIcon.vue'

const { state, zoom, view } = useStudio()
</script>

<template>
  <div class="bar glass" role="toolbar" aria-label="View">
    <button type="button" class="icon-btn" aria-label="Zoom out" title="Zoom out (-)" @click="view.zoomOut">
      <AppIcon name="zoom-out" />
    </button>
    <output class="zoom-value num" aria-label="Zoom level">{{ zoom }}%</output>
    <button type="button" class="icon-btn" aria-label="Zoom in" title="Zoom in (+)" @click="view.zoomIn">
      <AppIcon name="zoom-in" />
    </button>

    <span class="bar-divider"></span>

    <button type="button" class="icon-btn" aria-label="Reset view" title="Reset view (0)" @click="view.reset">
      <AppIcon name="home" />
    </button>
    <button type="button" class="icon-btn" aria-label="View from above" title="View from above" @click="view.top">
      <AppIcon name="plan" />
    </button>

    <span class="bar-divider"></span>

    <button
      type="button"
      class="icon-btn"
      :aria-pressed="state.snap"
      aria-label="Snap to 5 centimetre grid"
      title="Snap to 5 cm grid (hold Shift while dragging to skip)"
      @click="state.snap = !state.snap"
    >
      <AppIcon name="grid" />
    </button>
  </div>
</template>

<style scoped>
.zoom-value {
  min-width: 48px;
  font-size: 13px;
  font-weight: 650;
  text-align: center;
}
</style>
