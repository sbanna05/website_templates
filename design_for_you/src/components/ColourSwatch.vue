<script setup>
// A single colour chip. Click paints the selected block, drag paints any
// block, and pressing A adds the colour to the palette being built.
import { computed, ref } from 'vue'
import { startDrag } from '../composables/dragPayload'
import { usePalettes } from '../composables/usePalettes'
import { useStudio } from '../composables/useStudio'
import { isLight } from '../studio/color'

const props = defineProps({
  hex: { type: String, required: true },
  /** Extra context for the accessible name, e.g. "Tint 40%". */
  label: { type: String, default: '' },
  /** Given colours become the working colour when used; mixed ones do not. */
  given: { type: Boolean, default: false },
  /** Short text shown on the chip, e.g. "40%". */
  caption: { type: String, default: '' }
})

const studio = useStudio()
const palettes = usePalettes()
const justUsed = ref(false)

const accessibleName = computed(() => [props.label, props.hex].filter(Boolean).join(', '))
const isCurrent = computed(() => studio.selected.value?.color === props.hex)

function use() {
  studio.applyColor(props.hex, { given: props.given })
  if (!studio.selected.value) studio.announce(`${props.hex} is now the working colour. Select a block to paint it.`)
  // Brief press feedback that also confirms a click which had nothing to paint.
  justUsed.value = true
  setTimeout(() => { justUsed.value = false }, 320)
}

function addToPalette() {
  const added = palettes.addToDraft(props.hex)
  studio.announce(added ? `${props.hex} added to your palette` : `${props.hex} is already in your palette, or the palette is full`)
}
</script>

<template>
  <button
    type="button"
    class="swatch"
    :class="{ 'is-light': isLight(hex), 'is-current': isCurrent, 'is-used': justUsed }"
    :style="{ backgroundColor: hex }"
    :aria-label="accessibleName"
    :aria-pressed="isCurrent"
    :title="accessibleName"
    draggable="true"
    @click="use"
    @keydown.a.exact.prevent="addToPalette"
    @dragstart="startDrag($event, 'color', hex, { given })"
  >
    <span v-if="caption" class="swatch-caption num">{{ caption }}</span>
  </button>
</template>

<style scoped>
.swatch {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 40px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: var(--radius-card);
  color: #fff;
  cursor: grab;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 2px 6px rgba(0, 0, 0, 0.3);
  transition: transform var(--fast) var(--ease), box-shadow var(--fast);
}

.swatch.is-light {
  color: #16191c;
}

.swatch:hover {
  transform: translateY(-2px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 8px 16px rgba(0, 0, 0, 0.4);
}

.swatch:active {
  cursor: grabbing;
}

.swatch.is-used {
  transform: scale(0.92);
}

/* The colour currently on the selected block: a ring in the accent, with a
   dark gap so it reads on any swatch colour. */
.swatch.is-current {
  box-shadow: 0 0 0 2px var(--glass-solid), 0 0 0 4px var(--accent-strong);
}

.swatch-caption {
  position: absolute;
  right: 0;
  bottom: 3px;
  left: 0;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
}
</style>
