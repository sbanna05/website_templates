<script setup>
import { startColorDrag } from '../composables/useDragPayload'

defineProps({
  palettes: { type: Object, required: true },
  modelValue: { type: String, required: true }
})
const emit = defineEmits(['update:modelValue', 'apply-color'])

// Palette colors are the "given" colors — dropping one anywhere is allowed
// to become the new tint/shade/tone base (see ColorMixer.vue + App.vue).
function onDragStart(event, hex) {
  startColorDrag(event, hex, 'palette')
}
</script>

<template>
  <div>
    <select
      class="modern-select"
      :value="modelValue"
      @change="emit('update:modelValue', $event.target.value)"
    >
      <option value="vibrant">Vibrant & Pop-Art</option>
      <option value="pastel">Soft Pastel</option>
      <option value="elegant">Deep Elegant</option>
    </select>

    <div class="swatch-grid">
      <button
        v-for="color in palettes[modelValue]"
        :key="color"
        type="button"
        class="swatch color-swatch"
        :style="{ backgroundColor: color }"
        draggable="true"
        @dragstart="onDragStart($event, color)"
        @click="emit('apply-color', color)"
        :title="color"
      ></button>
    </div>
  </div>
</template>
