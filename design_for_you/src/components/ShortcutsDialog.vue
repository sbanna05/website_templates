<script setup>
import AppDialog from './AppDialog.vue'

defineProps({ open: { type: Boolean, required: true } })
const emit = defineEmits(['close'])

const GROUPS = [
  {
    title: 'Blocks (with the scene focused)',
    rows: [
      { keys: ['Page Down', 'Page Up'], action: 'Select the next or previous block' },
      { keys: ['←', '→', '↑', '↓'], action: 'Move the block 5 cm' },
      { keys: ['Shift', '+ arrow'], action: 'Move the block 25 cm' },
      { keys: ['[', ']'], action: 'Turn the block 15°' },
      { keys: ['Ctrl', 'D'], action: 'Duplicate the block' },
      { keys: ['Delete'], action: 'Delete the block' },
      { keys: ['Esc'], action: 'Clear the selection' }
    ]
  },
  {
    title: 'View',
    rows: [
      { keys: ['←', '→', '↑', '↓'], action: 'Orbit, when no block is selected' },
      { keys: ['+', '−'], action: 'Zoom in or out' },
      { keys: ['0'], action: 'Reset the view' },
      { keys: ['Scroll'], action: 'Zoom toward the pointer' },
      { keys: ['Right-drag'], action: 'Pan' }
    ]
  },
  {
    title: 'Anywhere',
    rows: [
      { keys: ['Ctrl', 'Z'], action: 'Undo' },
      { keys: ['Ctrl', 'Shift', 'Z'], action: 'Redo' },
      { keys: ['A'], action: 'Add the focused colour to your palette' },
      { keys: ['?'], action: 'Open this list' }
    ]
  }
]
</script>

<template>
  <AppDialog :open="open" title="Keyboard shortcuts" @close="emit('close')">
    <p class="section-hint">
      Everything in the studio works without a mouse. Tab moves between controls;
      on a Mac, use Command in place of Ctrl.
    </p>
    <section v-for="group in GROUPS" :key="group.title" class="section">
      <h3 class="section-title">{{ group.title }}</h3>
      <dl class="shortcuts">
        <div v-for="row in group.rows" :key="row.action" class="shortcut">
          <dt>
            <kbd v-for="key in row.keys" :key="key">{{ key }}</kbd>
          </dt>
          <dd>{{ row.action }}</dd>
        </div>
      </dl>
    </section>
  </AppDialog>
</template>

<style scoped>
.shortcuts {
  margin: 0;
}

.shortcut {
  display: grid;
  grid-template-columns: 190px 1fr;
  align-items: center;
  gap: var(--space-3);
  min-height: 36px;
  border-top: 1px solid var(--line);
}

dt {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

dd {
  margin: 0;
  color: var(--text-soft);
}

/* Key caps are the one place a fixed-width face earns its keep. */
kbd {
  min-width: 26px;
  padding: 2px 7px;
  border: 1px solid var(--line-strong);
  border-bottom-width: 2px;
  border-radius: 6px;
  background: var(--surface);
  font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace;
  font-size: 12px;
  text-align: center;
}

@media (max-width: 520px) {
  .shortcut {
    grid-template-columns: 1fr;
    gap: 4px;
    padding: var(--space-2) 0;
  }
}
</style>
