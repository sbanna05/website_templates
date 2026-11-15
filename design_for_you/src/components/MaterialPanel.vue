<script setup>
// Materials tab: every texture with its name and licence. Click applies it
// to the selected block; drag applies it to any block.
import { computed } from 'vue'
import { textures } from '../config/textures'
import { startDrag } from '../composables/dragPayload'
import { useStudio } from '../composables/useStudio'
import { proceduralThumbnail } from '../studio/proceduralTextures'
import AppIcon from './AppIcon.vue'

defineEmits(['open-licences'])

const studio = useStudio()
const { selected, loadingTexture, textureError } = studio

const items = computed(() => textures.map((texture) => ({
  ...texture,
  thumbnail: texture.kind === 'procedural' ? proceduralThumbnail(texture.id) : texture.thumbUrl
})))

const currentTexture = computed(() => selected.value?.texture ?? null)

function apply(textureId) {
  if (selected.value) studio.applyTexture(textureId)
  else studio.announce('Select a block first, or drag the material onto one.')
}
</script>

<template>
  <div>
    <section class="section">
      <h3 class="section-title">Materials</h3>
      <p v-if="!selected" class="section-hint material-note">
        Select a block to give it a material, or drag one onto any block.
      </p>
      <p v-if="textureError" class="notice material-note" role="alert">{{ textureError }}</p>

      <ul class="material-grid">
        <li>
          <button
            type="button"
            class="material"
            :aria-pressed="selected ? currentTexture === null : undefined"
            @click="apply(null)"
          >
            <span class="material-picture material-none"></span>
            <span class="material-name">Plain colour</span>
            <span class="material-source">No texture</span>
          </button>
        </li>
        <li v-for="texture in items" :key="texture.id">
          <button
            type="button"
            class="material"
            draggable="true"
            :aria-pressed="selected ? currentTexture === texture.id : undefined"
            :aria-busy="loadingTexture === texture.id"
            @click="apply(texture.id)"
            @dragstart="startDrag($event, 'texture', texture.id)"
          >
            <span class="material-picture">
              <img :src="texture.thumbnail" :alt="texture.alt" width="96" height="96" loading="lazy" draggable="false" />
              <span v-if="loadingTexture === texture.id" class="material-loading">
                <span class="spinner"></span>
                <span class="visually-hidden">Loading {{ texture.name }}</span>
              </span>
              <span v-else-if="currentTexture === texture.id" class="material-check">
                <AppIcon name="check" :size="14" />
              </span>
            </span>
            <span class="material-name">{{ texture.name }}</span>
            <span class="material-source">{{ texture.kind === 'photo' ? `${texture.source}, CC0` : 'Made in app' }}</span>
          </button>
        </li>
      </ul>
    </section>

    <section class="section">
      <p class="section-hint">
        A block's colour tints its material, so pale materials take colour best.
        Every image here is checked and free to use.
      </p>
      <button type="button" class="btn licences-link" @click="$emit('open-licences')">
        See image licences
      </button>
    </section>
  </div>
</template>

<style scoped>
.material-note {
  margin-bottom: var(--space-3);
}

.material-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Stretch each card to its row, so two-line names do not leave ragged bottoms. */
.material-grid li {
  display: flex;
}

.material {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 6px;
  border: 1px solid transparent;
  border-radius: var(--radius-card);
  background: var(--surface);
  text-align: left;
  transition: background var(--fast), border-color var(--fast), transform var(--fast) var(--ease);
}

.material[draggable='true'] {
  cursor: grab;
}

.material:hover {
  background: var(--surface-hover);
  transform: translateY(-2px);
}

.material[aria-pressed='true'] {
  border-color: var(--accent-strong);
  background: var(--accent-wash);
}

.material-picture {
  position: relative;
  display: block;
  aspect-ratio: 1;
  margin-bottom: 6px;
  overflow: hidden;
  /* card radius 8 - padding 6 */
  border-radius: 2px;
  background: var(--surface);
}

.material-picture img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.material-none {
  background:
    linear-gradient(135deg, transparent 47%, var(--line-strong) 47% 53%, transparent 53%),
    var(--surface);
}

.material-loading,
.material-check {
  position: absolute;
  display: grid;
  place-items: center;
}

.material-loading {
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.material-check {
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--accent-ink);
}

.material-name {
  font-size: 12.5px;
  font-weight: 650;
  line-height: 1.25;
}

.material-source {
  font-size: 11.5px;
  color: var(--text-soft);
}

.licences-link {
  margin-top: var(--space-3);
}
</style>
