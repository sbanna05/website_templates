<script setup>
defineProps({
  items: { type: Array, required: true } // current mode's sceneConfig entries
})

// This is intentionally a stub. Once a real model pipeline exists, replace
// this with an upload handler that stores the file, gets back a URL, and
// sets `modelUrl` on the matching entry in src/config/sceneObjects.js
// (or persists it wherever your app keeps that config).
function onDropStub(event, item) {
  console.info(
    `[mock] Would upload a model for "${item.label}". ` +
    'Wire this handler to your real upload pipeline when it exists.'
  )
}
</script>

<template>
  <div class="model-library">
    <p class="model-library-note">
      Model uploads aren't wired up yet — this screen is ready for them so
      nothing changes visually once real assets arrive.
    </p>
    <div
      v-for="item in items"
      :key="item.id"
      class="model-slot"
      @dragover.prevent
      @drop.prevent="onDropStub($event, item)"
    >
      <div class="model-slot-info">
        <span class="model-slot-label">{{ item.label }}</span>
        <span class="model-slot-status" :class="{ ready: item.modelUrl }">
          {{ item.modelUrl ? 'Model linked' : 'Using mock shape' }}
        </span>
      </div>
      <span class="model-slot-cta">Drop .glb (soon)</span>
    </div>
  </div>
</template>

<style scoped>
.model-library-note {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0 0 1rem 0;
  line-height: 1.5;
}

.model-slot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  margin-bottom: 0.6rem;
  border: 1px dashed rgba(74, 93, 78, 0.35);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.3);
  cursor: not-allowed;
}

.model-slot-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.model-slot-label {
  font-size: 0.88rem;
  color: var(--text-main);
}

.model-slot-status {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.model-slot-status.ready { color: var(--accent-green); }

.model-slot-cta {
  font-size: 0.7rem;
  color: var(--text-muted);
  white-space: nowrap;
}
</style>
