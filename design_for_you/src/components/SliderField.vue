<script setup>
// A labelled slider paired with a number box. Emits `live` while dragging
// (preview, no undo step) and `commit` when the value is settled.
import { useId } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  modelValue: { type: Number, required: true },
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  step: { type: Number, default: 1 },
  unit: { type: String, default: '' }
})
const emit = defineEmits(['live', 'commit'])

const id = useId()

function commitTyped(event) {
  const value = Number(event.target.value)
  if (event.target.value === '' || !Number.isFinite(value)) {
    event.target.value = props.modelValue
    return
  }
  // Forgive out-of-range entries by holding them at the nearest limit.
  const held = Math.min(props.max, Math.max(props.min, value))
  event.target.value = held
  emit('commit', held)
}
</script>

<template>
  <div class="slider-field">
    <label :for="id" class="slider-label">{{ label }}</label>
    <input
      :id="id"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      :aria-valuetext="`${modelValue} ${unit}`"
      @input="emit('live', Number($event.target.value))"
      @change="emit('commit', Number($event.target.value))"
    />
    <span class="slider-number">
      <input
        type="number"
        class="field num"
        :min="min"
        :max="max"
        :step="step"
        :value="modelValue"
        :aria-label="`${label} in ${unit}`"
        @change="commitTyped"
        @keydown.enter="$event.target.blur()"
      />
      <span class="slider-unit" aria-hidden="true">{{ unit }}</span>
    </span>
  </div>
</template>

<style scoped>
.slider-field {
  display: grid;
  grid-template-columns: 52px 1fr 86px;
  align-items: center;
  gap: var(--space-3);
}

.slider-field + .slider-field {
  margin-top: var(--space-2);
}

.slider-label {
  font-size: 13px;
  color: var(--text-soft);
}

.slider-number {
  position: relative;
  display: block;
}

.slider-number .field {
  width: 100%;
  padding-right: 34px;
  text-align: right;
  appearance: textfield;
  -moz-appearance: textfield;
}

.slider-number .field::-webkit-inner-spin-button,
.slider-number .field::-webkit-outer-spin-button {
  appearance: none;
  -webkit-appearance: none;
}

.slider-unit {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--text-soft);
  pointer-events: none;
}
</style>
