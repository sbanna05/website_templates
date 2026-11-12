<script setup>
// One icon family for the whole app: 20 px grid, 1.75 px round strokes, no
// fills. Icons are decorative; the control that holds one carries the label.
defineProps({
  name: { type: String, required: true },
  size: { type: Number, default: 20 }
})

const PATHS = {
  undo: 'M8 7 4 11l4 4M4 11h8.5a4.5 4.5 0 0 1 0 9H10',
  redo: 'm16 7 4 4-4 4m4-4h-8.5a4.5 4.5 0 0 0 0 9H14',
  'zoom-in': 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.05-4.05M11 8v6M8 11h6',
  'zoom-out': 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.05-4.05M8 11h6',
  home: 'm4 11 8-7 8 7M6.5 9.5V20h11V9.5M10 20v-5.5h4V20',
  plan: 'M4 4h16v16H4zM4 10h7V4M11 20v-6h9',
  grid: 'M4 4h16v16H4zM4 12h16M12 4v16',
  trash: 'M5 7h14M10 7V4.5h4V7M7 7l.8 12.5h8.4L17 7M10 11v5M14 11v5',
  copy: 'M9 9h10.5v10.5H9zM15 9V4.5H4.5V15H9',
  close: 'M6 6l12 12M18 6 6 18',
  download: 'M12 4v11m0 0-4-4m4 4 4-4M5 19.5h14',
  shield: 'M12 3.5 5 6v5.5c0 4.2 2.9 7.3 7 9 4.1-1.7 7-4.8 7-9V6l-7-2.5Zm-3 8.5 2.2 2.2 3.8-4.2',
  keyboard: 'M3.5 6.5h17v11h-17zM7 10.5h.01M10.5 10.5h.01M14 10.5h.01M17.5 10.5h.01M8 14h8',
  plus: 'M12 5v14M5 12h14',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  'rotate-left': 'M4.5 12a7.5 7.5 0 1 0 2.4-5.5M4.5 4.5v4.2h4.2',
  'rotate-right': 'M19.5 12a7.5 7.5 0 1 1-2.4-5.5M19.5 4.5v4.2h-4.2',
  reset: 'M4.5 12a7.5 7.5 0 1 0 2.4-5.5M4.5 4.5v4.2h4.2M12 8.5V12l2.5 1.5',
  chevron: 'm6 9 6 6 6-6'
}
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="PATHS[name]" />
  </svg>
</template>
