<script setup>
import { computed } from 'vue'
import { tint, shade, tone, MIX_STEPS, isLight } from '../composables/useColorUtils'
import { startColorDrag } from '../composables/useDragPayload'

// `modelValue` is the base color, fully owned by the parent (App.vue).
// This component NEVER mutates it itself except via the native color
// picker or the v-model update — clicking or dragging a mixed swatch only
// emits 'apply-color' to paint the object, it never touches the base.
// This is what fixes the "mixed color becomes the new base" bug: there is
// no internal state here that could drift out of sync or feed back on itself.
const props = defineProps({
  modelValue: { type: String, required: true }
})
const emit = defineEmits(['update:modelValue', 'apply-color'])

const rows = computed(() => [
  { key: 'tint', label: 'Tints', hint: 'mixed with white', fn: tint },
  { key: 'shade', label: 'Shades', hint: 'mixed with black', fn: shade },
  { key: 'tone', label: 'Tones', hint: 'mixed with gray', fn: tone }
].map((row) => ({
  ...row,
  swatches: MIX_STEPS.map((step) => ({
    percent: Math.round(step * 100),
    hex: row.fn(props.modelValue, step)
  }))
})))

function onDragStart(event, hex) {
  // source: 'mixer' — this is what tells App.vue not to treat this as a new base.
  startColorDrag(event, hex, 'mixer')
}
</script>

<template>
  <div class="mixer">
    <div class="mixer-head">
      <label class="mixer-picker">
        <input
          type="color"
          :value="modelValue"
          @input="emit('update:modelValue', $event.target.value)"
          aria-label="Base color"
        />
        <span class="mixer-hex">{{ modelValue }}</span>
      </label>
      <button class="ghost-btn" type="button" @click="emit('apply-color', modelValue)">
        Use base color
      </button>
    </div>

    <div v-for="row in rows" :key="row.key" class="mixer-row">
      <div class="mixer-row-label">
        <span class="row-title">{{ row.label }}</span>
        <span class="row-hint">{{ row.hint }}</span>
      </div>
      <div class="mixer-swatches">
        <button
          v-for="sw in row.swatches"
          :key="sw.percent"
          type="button"
          class="mixer-swatch"
          :class="{ 'is-light': isLight(sw.hex) }"
          :style="{ backgroundColor: sw.hex }"
          draggable="true"
          @dragstart="onDragStart($event, sw.hex)"
          @click="emit('apply-color', sw.hex)"
          :title="`${sw.hex} · ${sw.percent}%`"
        >
          <span class="mixer-swatch-percent">{{ sw.percent }}%</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mixer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.mixer-picker {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
}

.mixer-picker input[type='color'] {
  width: 36px;
  height: 36px;
  border: 2px solid var(--glass-border);
  border-radius: 50%;
  padding: 0;
  cursor: pointer;
  background: none;
}

.mixer-picker input[type='color']::-webkit-color-swatch-wrapper { padding: 0; }
.mixer-picker input[type='color']::-webkit-color-swatch { border: none; border-radius: 50%; }

.mixer-hex {
  font-size: 0.85rem;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}

.ghost-btn {
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(74, 93, 78, 0.2);
  border-radius: 8px;
  padding: 0.5rem 0.9rem;
  font-family: 'Inter', sans-serif;
  font-size: 0.8rem;
  color: var(--accent-green);
  cursor: pointer;
  transition: all 0.2s ease;
}

.ghost-btn:hover {
  background: #fff;
  border-color: var(--accent-green);
}

.mixer-row {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  margin-bottom: 0.9rem;
}

.mixer-row-label {
  display: flex;
  flex-direction: column;
  width: 84px;
  flex-shrink: 0;
}

.row-title {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-weight: 600;
  font-size: 1rem;
  color: var(--text-main);
}

.row-hint {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.mixer-swatches {
  display: flex;
  gap: 0.5rem;
  flex: 1;
}

.mixer-swatch {
  flex: 1;
  aspect-ratio: 1;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 10px;
  cursor: grab;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 4px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.06);
}

.mixer-swatch:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.12);
}

.mixer-swatch:active { cursor: grabbing; }

.mixer-swatch-percent {
  font-size: 0.6rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

.mixer-swatch.is-light .mixer-swatch-percent {
  color: rgba(0, 0, 0, 0.55);
  text-shadow: none;
}
</style>
