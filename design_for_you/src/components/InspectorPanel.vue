<script setup>
// Everything about the selected block: size, position, finish and actions.
// Below it, a list of the scene's blocks gives a non-3D way to select one.
import { computed } from 'vue'
import { getDefinition } from '../config/catalog'
import { textureById } from '../config/textures'
import { useStudio } from '../composables/useStudio'
import { FINISHES } from '../config/finishes'
import AppIcon from './AppIcon.vue'
import SliderField from './SliderField.vue'

const studio = useStudio()
const { state, blocks, selected } = studio

const definition = computed(() => (selected.value ? getDefinition(selected.value.type) : null))
const toCm = (metres) => Math.round(metres * 100)

const SIZE_AXES = [
  { axis: 'w', label: 'Width' },
  { axis: 'h', label: 'Height' },
  { axis: 'd', label: 'Depth' }
]

const sizeFields = computed(() => {
  const limits = definition.value?.limits
  if (!limits || selected.value.fixed) return []
  return SIZE_AXES.map(({ axis, label }) => ({
    axis,
    label,
    value: toCm(selected.value[axis]),
    min: toCm(limits[axis][0]),
    max: toCm(limits[axis][1])
  }))
})

const materialName = computed(() =>
  selected.value?.texture ? textureById[selected.value.texture].name : 'Plain colour')

/** Scene list entries. Repeated block types are numbered so each name is unique. */
const sceneItems = computed(() => {
  const counts = {}
  return blocks.value.map((block) => {
    const name = getDefinition(block.type).name
    counts[name] = (counts[name] ?? 0) + 1
    return { block, name, number: counts[name] }
  }).map((item) => ({
    ...item,
    label: counts[item.name] > 1 ? `${item.name} ${item.number}` : item.name
  }))
})

const turn = (degrees) => studio.rotateBlock(selected.value.id, selected.value.rot + degrees)
</script>

<template>
  <div class="inspector-content">
    <template v-if="selected">
      <header class="inspector-head">
        <span class="inspector-chip" :style="{ backgroundColor: selected.color }" aria-hidden="true"></span>
        <div>
          <h2 class="headline">{{ definition.name }}</h2>
          <p class="section-hint num">{{ materialName }}, {{ selected.color }}</p>
        </div>
      </header>

      <p v-if="selected.fixed" class="section-hint fixed-note">
        Part of the stage. You can paint it, but it stays in place.
      </p>

      <section v-if="sizeFields.length" class="section">
        <h3 class="section-title">Size</h3>
        <SliderField
          v-for="field in sizeFields"
          :key="field.axis"
          :label="field.label"
          :model-value="field.value"
          :min="field.min"
          :max="field.max"
          unit="cm"
          @live="studio.resizeBlock(selected.id, field.axis, $event / 100, { live: true })"
          @commit="studio.resizeBlock(selected.id, field.axis, $event / 100)"
        />
      </section>

      <section v-if="!selected.fixed" class="section">
        <h3 class="section-title">Position</h3>
        <SliderField
          label="Lift"
          :model-value="toCm(selected.y)"
          :min="0"
          :max="260"
          unit="cm"
          @live="studio.setElevation(selected.id, $event / 100, { live: true })"
          @commit="studio.setElevation(selected.id, $event / 100)"
        />
        <SliderField
          label="Turn"
          :model-value="Math.round(selected.rot)"
          :min="0"
          :max="359"
          unit="°"
          @live="studio.rotateBlock(selected.id, $event, { live: true })"
          @commit="studio.rotateBlock(selected.id, $event)"
        />
        <div class="turn-buttons">
          <button type="button" class="btn" @click="turn(-90)">
            <AppIcon name="rotate-left" :size="16" />
            Quarter left
          </button>
          <button type="button" class="btn" @click="turn(90)">
            <AppIcon name="rotate-right" :size="16" />
            Quarter right
          </button>
        </div>
      </section>

      <section class="section">
        <h3 class="section-title">Finish</h3>
        <div class="segmented" role="group" aria-label="Surface finish">
          <button
            v-for="finish in FINISHES"
            :key="finish.id"
            type="button"
            :aria-pressed="selected.finish === finish.id"
            @click="studio.setPaint(selected.id, { finish: finish.id })"
          >
            {{ finish.label }}
          </button>
        </div>
        <SliderField
          v-if="selected.texture"
          class="pattern-size"
          label="Pattern"
          :model-value="Math.round(selected.textureScale * 100)"
          :min="25"
          :max="400"
          :step="5"
          unit="%"
          @live="studio.setPaint(selected.id, { textureScale: $event / 100 }, { live: true })"
          @commit="studio.setPaint(selected.id, { textureScale: $event / 100 })"
        />
      </section>

      <section v-if="!selected.fixed" class="section actions">
        <button type="button" class="btn" @click="studio.duplicateBlock(selected.id)">
          <AppIcon name="copy" :size="16" />
          Duplicate
        </button>
        <button type="button" class="btn btn-danger" @click="studio.removeBlock(selected.id)">
          <AppIcon name="trash" :size="16" />
          Delete
        </button>
      </section>
    </template>

    <template v-else>
      <h2 class="headline">Pick a block to shape it</h2>
      <p class="section-hint empty-note">
        Click a block in the scene or in the list below. Then set its size here,
        and paint it from the Colours and Materials tabs.
      </p>
    </template>

    <section class="section">
      <h3 class="section-title">In this {{ state.mode === 'interior' ? 'room' : 'outfit' }}</h3>
      <ul class="scene-list">
        <li v-for="item in sceneItems" :key="item.block.id">
          <button
            type="button"
            class="scene-item"
            :aria-pressed="state.selectedId === item.block.id"
            @click="studio.select(item.block.id)"
          >
            <span class="scene-chip" :style="{ backgroundColor: item.block.color }" aria-hidden="true"></span>
            <span class="scene-name">{{ item.label }}</span>
            <span v-if="!item.block.fixed" class="scene-size num">
              {{ toCm(item.block.w) }} × {{ toCm(item.block.h) }} × {{ toCm(item.block.d) }}
            </span>
          </button>
        </li>
      </ul>
      <button type="button" class="btn btn-block reset" @click="studio.resetScene()">
        <AppIcon name="reset" :size="16" />
        Start this {{ state.mode === 'interior' ? 'room' : 'outfit' }} again
      </button>
    </section>
  </div>
</template>

<style scoped>
.inspector-head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.inspector-chip {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: var(--radius-card);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

/* The header and notes are not sections, so space the first section after them too. */
.inspector-content > .section:not(:first-child) {
  margin-top: var(--space-5);
}

.fixed-note,
.empty-note {
  margin-top: var(--space-2);
}

.turn-buttons,
.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}

.turn-buttons {
  margin-top: var(--space-3);
}

.pattern-size {
  margin-top: var(--space-3);
}

.scene-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.scene-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  min-height: 36px;
  padding: 0 var(--space-2);
  border: 0;
  border-radius: var(--radius-card);
  background: transparent;
  text-align: left;
  transition: background var(--fast);
}

.scene-item:hover {
  background: var(--surface-hover);
}

.scene-item[aria-pressed='true'] {
  background: var(--accent-wash);
  color: var(--accent-strong);
}

.scene-chip {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
}

.scene-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scene-size {
  font-size: 12px;
  color: var(--text-soft);
}

.reset {
  margin-top: var(--space-3);
}

@media (pointer: coarse) {
  .scene-item {
    min-height: 44px;
  }
}
</style>
