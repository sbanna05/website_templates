<script setup>
// Colours tab: the working colour, its tints/shades/tones, colours that sit
// well beside it, ready-made palettes, and the user's own saved palettes.
import { computed, ref } from 'vue'
import { curatedPalettes } from '../config/palettes'
import { readDrag } from '../composables/dragPayload'
import { MAX_PALETTE_COLORS, usePalettes } from '../composables/usePalettes'
import { useStudio } from '../composables/useStudio'
import { MIX_ROWS, MIX_STEPS, harmonies, parseHex } from '../studio/color'
import AppIcon from './AppIcon.vue'
import ColourSwatch from './ColourSwatch.vue'

const studio = useStudio()
const palettes = usePalettes()
const { state, selected } = studio

// ---- Working colour -------------------------------------------------------

const hexDraft = ref(null) // text being typed; null when showing the saved value
const hexInvalid = ref(false)

function commitHex(event) {
  const color = parseHex(event.target.value)
  hexInvalid.value = !color
  if (color) {
    state.baseColor = color
    hexDraft.value = null
  }
}

const mixRows = computed(() => MIX_ROWS.map((row) => ({
  ...row,
  swatches: MIX_STEPS.map((step) => ({
    percent: Math.round(step * 100),
    hex: row.fn(state.baseColor, step)
  }))
})))

const harmonyRows = computed(() => harmonies(state.baseColor))

// ---- Building and saving a palette ----------------------------------------

const paletteName = ref('')
const draftFull = computed(() => palettes.draft.value.length >= MAX_PALETTE_COLORS)
const isDraftDropTarget = ref(false)

function addBaseToDraft() {
  if (!palettes.addToDraft(state.baseColor)) studio.announce(`${state.baseColor} is already in this palette`)
}

function onDraftDrop(event) {
  isDraftDropTarget.value = false
  const payload = readDrag(event)
  if (payload?.kind === 'color') palettes.addToDraft(payload.value)
}

function savePalette() {
  const palette = palettes.saveDraft(paletteName.value)
  if (!palette) return
  studio.announce(`Palette ${palette.name} saved`)
  paletteName.value = ''
}

function removePalette(palette) {
  palettes.removePalette(palette.id)
  studio.announce(`Palette ${palette.name} deleted`)
}
</script>

<template>
  <div>
    <section class="section">
      <h3 class="section-title">Working colour</h3>
      <div class="working">
        <label class="working-picker" :style="{ backgroundColor: state.baseColor }">
          <span class="visually-hidden">Pick the working colour</span>
          <input type="color" :value="state.baseColor" @input="state.baseColor = $event.target.value" />
        </label>
        <input
          type="text"
          class="field working-hex num"
          :class="{ 'is-invalid': hexInvalid }"
          :value="hexDraft ?? state.baseColor"
          aria-label="Working colour as a hex code"
          :aria-invalid="hexInvalid"
          aria-describedby="hex-error"
          spellcheck="false"
          maxlength="7"
          @input="hexDraft = $event.target.value"
          @change="commitHex"
          @keydown.enter="commitHex"
        />
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!selected"
          @click="studio.applyColor(state.baseColor)"
        >
          Paint
        </button>
      </div>
      <p v-if="hexInvalid" id="hex-error" class="notice working-note">
        Use a hex code such as #2f5d62.
      </p>
      <p v-else-if="!selected" class="section-hint working-note">
        Select a block to paint it, or drag any colour onto one.
      </p>

      <div class="mix">
        <div v-for="row in mixRows" :key="row.key" class="mix-row">
          <div class="mix-label">
            <span class="mix-name">{{ row.label }}</span>
            <span class="section-hint">{{ row.hint }}</span>
          </div>
          <div class="swatch-row">
            <ColourSwatch
              v-for="swatch in row.swatches"
              :key="swatch.percent"
              :hex="swatch.hex"
              :label="`${row.label.slice(0, -1)} ${swatch.percent}%`"
              :caption="`${swatch.percent}%`"
            />
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <h3 class="section-title">Goes well with {{ state.baseColor }}</h3>
      <div v-for="row in harmonyRows" :key="row.key" class="mix-row">
        <div class="mix-label">
          <span class="mix-name">{{ row.label }}</span>
          <span class="section-hint">{{ row.hint }}</span>
        </div>
        <div class="swatch-row">
          <ColourSwatch v-for="hex in row.colors" :key="hex" :hex="hex" :label="row.label" given />
        </div>
      </div>
    </section>

    <section class="section">
      <h3 class="section-title">Your palettes</h3>
      <div
        class="draft"
        :class="{ 'is-drop-target': isDraftDropTarget }"
        @dragenter.prevent="isDraftDropTarget = true"
        @dragover.prevent
        @dragleave="isDraftDropTarget = $event.currentTarget.contains($event.relatedTarget)"
        @drop.prevent="onDraftDrop"
      >
        <ul v-if="palettes.draft.value.length" class="draft-chips">
          <li v-for="(hex, index) in palettes.draft.value" :key="hex">
            <button
              type="button"
              class="draft-chip"
              :style="{ backgroundColor: hex }"
              :aria-label="`Remove ${hex} from the new palette`"
              :title="`Remove ${hex}`"
              @click="palettes.removeFromDraft(index)"
            >
              <AppIcon name="close" :size="14" />
            </button>
          </li>
        </ul>
        <p v-else class="section-hint">
          Drag colours here, or focus any colour and press A.
        </p>
        <button type="button" class="btn" :disabled="draftFull" @click="addBaseToDraft">
          <AppIcon name="plus" :size="16" />
          Add working colour
        </button>
      </div>

      <form v-if="palettes.draft.value.length" class="draft-save" @submit.prevent="savePalette">
        <input
          v-model="paletteName"
          type="text"
          class="field"
          placeholder="Palette name"
          aria-label="Palette name"
          maxlength="40"
          required
        />
        <button type="submit" class="btn btn-primary" :disabled="!paletteName.trim()">Save palette</button>
      </form>
      <p v-if="palettes.saveFailed.value" class="notice" role="alert">
        This browser blocked saving. The palette will last until you close the page.
      </p>

      <ul class="palette-list">
        <li v-for="palette in palettes.saved.value" :key="palette.id" class="palette">
          <div class="palette-head">
            <span class="mix-name">{{ palette.name }}</span>
            <button
              type="button"
              class="icon-btn palette-delete"
              :aria-label="`Delete palette ${palette.name}`"
              :title="`Delete ${palette.name}`"
              @click="removePalette(palette)"
            >
              <AppIcon name="trash" :size="16" />
            </button>
          </div>
          <div class="swatch-row">
            <ColourSwatch v-for="hex in palette.colors" :key="hex" :hex="hex" :label="palette.name" given />
          </div>
        </li>
      </ul>
    </section>

    <section class="section">
      <h3 class="section-title">Ready-made palettes</h3>
      <ul class="palette-list">
        <li v-for="palette in curatedPalettes" :key="palette.id" class="palette">
          <div class="palette-head">
            <span class="mix-name">{{ palette.name }}</span>
          </div>
          <div class="swatch-row">
            <ColourSwatch v-for="hex in palette.colors" :key="hex" :hex="hex" :label="palette.name" given />
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.working {
  display: grid;
  grid-template-columns: 44px 1fr auto;
  gap: var(--space-2);
}

.working-picker {
  position: relative;
  height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: var(--radius-card);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
  cursor: pointer;
}

.working-picker:focus-within {
  outline: 2px solid var(--accent-strong);
  outline-offset: 2px;
}

.working-picker input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.working-hex,
.working .btn {
  min-height: 44px;
}

.working-hex {
  min-width: 0;
  font-weight: 600;
}

.working-hex.is-invalid {
  border-color: var(--danger);
}

.working-note {
  margin-top: var(--space-2);
}

.mix {
  margin-top: var(--space-4);
}

.mix-row + .mix-row {
  margin-top: var(--space-3);
}

.mix-label {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: 6px;
}

.mix-name {
  font-size: 13px;
  font-weight: 650;
}

.draft {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius-card);
  transition: background var(--fast), border-color var(--fast);
}

.draft.is-drop-target {
  border-color: var(--accent-strong);
  background: var(--accent-wash);
}

.draft-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.draft-chip {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.22);
  /* draft radius 8 - padding 12 would be negative, so chips use a small fixed curve */
  border-radius: 4px;
  color: transparent;
  transition: color var(--fast), transform var(--fast) var(--ease);
}

.draft-chip:hover,
.draft-chip:focus-visible {
  color: #fff;
  /* The remove icon needs a scrim to stay visible on pale colours. */
  box-shadow: inset 0 0 0 18px rgba(0, 0, 0, 0.45);
}

.draft-save {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.draft-save .field {
  min-width: 0;
}

.palette-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.palette {
  margin-top: var(--space-3);
}

.palette-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 28px;
  margin-bottom: 4px;
}

.palette-delete {
  width: 28px;
  height: 28px;
  color: var(--text-soft);
}

.palette-delete:hover {
  color: var(--danger);
}

@media (pointer: coarse) {
  .palette-delete {
    width: 44px;
    height: 44px;
  }
}
</style>
