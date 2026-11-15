<script setup>
// The block library for the current mode. Each card shows a real render of
// the block; click to add it, or drag it to a spot in the scene.
import { computed, onMounted, reactive } from 'vue'
import { catalog, catalogGroups } from '../config/catalog'
import { startDrag } from '../composables/dragPayload'
import { useStudio } from '../composables/useStudio'

const studio = useStudio()
const groups = computed(() => catalogGroups(studio.state.mode))

// Filled in one by one as each render finishes; cards show a skeleton until then.
const thumbnails = reactive({})

onMounted(() => {
  const missing = [...catalog.interior, ...catalog.outfit].filter((definition) => !thumbnails[definition.type])
  if (!missing.length) return
  // The renderer arrives with the 3D chunk, after the interface is on screen.
  import('../studio/thumbnails')
    .then(({ renderThumbnails }) => renderThumbnails(missing, (type, dataUrl) => { thumbnails[type] = dataUrl }))
    // Without WebGL the cards still work; they show a colour chip instead of a render.
    .catch(() => missing.forEach((definition) => { thumbnails[definition.type] ??= 'unavailable' }))
})

const centimetres = (definition) => definition.size.map((metres) => Math.round(metres * 100)).join(' × ')
</script>

<template>
  <div>
    <section v-for="group in groups" :key="group.name" class="section">
      <h3 class="section-title">{{ group.name }}</h3>
      <ul class="catalog-grid">
        <li v-for="definition in group.items" :key="definition.type">
          <button
            type="button"
            class="catalog-card"
            draggable="true"
            :aria-label="`Add ${definition.name}, ${centimetres(definition)} centimetres`"
            @click="studio.addBlock(definition.type)"
            @dragstart="startDrag($event, 'block', definition.type)"
          >
            <span class="catalog-picture" :class="{ skeleton: !thumbnails[definition.type] }">
              <img
                v-if="thumbnails[definition.type] && thumbnails[definition.type] !== 'unavailable'"
                :src="thumbnails[definition.type]"
                :alt="definition.alt"
                width="176"
                height="176"
                draggable="false"
              />
              <span
                v-else-if="thumbnails[definition.type]"
                class="catalog-chip"
                :style="{ backgroundColor: definition.color }"
              ></span>
            </span>
            <span class="catalog-name">{{ definition.name }}</span>
            <span class="catalog-size num">{{ centimetres(definition) }} cm</span>
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.catalog-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: var(--space-2);
  border: 1px solid transparent;
  border-radius: var(--radius-card);
  background: var(--surface);
  text-align: left;
  cursor: grab;
  transition: background var(--fast), border-color var(--fast), transform var(--fast) var(--ease);
}

.catalog-card:hover {
  background: var(--surface-hover);
  border-color: var(--line-strong);
  transform: translateY(-2px);
}

.catalog-card:active {
  cursor: grabbing;
  transform: scale(0.97);
}

.catalog-picture {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  margin-bottom: var(--space-2);
  /* card radius 8 - padding 8 leaves no room for a curve, so keep a hairline one */
  border-radius: 2px;
}

.catalog-picture img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 10px 10px rgba(0, 0, 0, 0.35));
  transition: transform var(--medium) var(--ease);
}

.catalog-card:hover .catalog-picture img {
  transform: scale(1.06) rotate(-2deg);
}

.catalog-chip {
  width: 56%;
  aspect-ratio: 1;
  border-radius: var(--radius-card);
}

.catalog-name {
  font-size: 13px;
  font-weight: 650;
}

.catalog-size {
  font-size: 12px;
  color: var(--text-soft);
}
</style>
