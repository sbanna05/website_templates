<script setup>
import { ref } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import SceneObject from './SceneObject.vue'
import DropRaycaster from './DropRaycaster.vue'
import { readDragPayload } from '../composables/useDragPayload'

defineProps({
  items: { type: Array, required: true },
  paintMap: { type: Object, required: true }
})
const emit = defineEmits(['drop-color', 'drop-texture'])

const wrapperEl = ref(null)
const isDragOver = ref(false)
let pick = null
function onRaycasterReady(fn) { pick = fn }

function onDrop(event) {
  isDragOver.value = false
  if (!pick || !wrapperEl.value) return

  const payload = readDragPayload(event)
  if (!payload) return

  const rect = wrapperEl.value.getBoundingClientRect()
  const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1
  const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1

  const targetId = pick(ndcX, ndcY)
  if (!targetId) return

  if (payload.kind === 'color') {
    emit('drop-color', { id: targetId, color: payload.value, source: payload.source })
  } else {
    emit('drop-texture', { id: targetId, texture: payload.value })
  }
}
</script>

<template>
  <div
    class="canvas-wrapper"
    :class="{ 'is-drag-over': isDragOver }"
    ref="wrapperEl"
    @dragenter.prevent="isDragOver = true"
    @dragover.prevent
    @dragleave="isDragOver = false"
    @drop.prevent="onDrop"
  >
    <Suspense>
      <TresCanvas clear-color="#e8e5df">
        <TresPerspectiveCamera :position="[5, 4, 7]" :look-at="[0, 1, 0]" />
        <OrbitControls />

        <TresAmbientLight :intensity="0.7" />
        <TresDirectionalLight :position="[5, 10, 5]" :intensity="1" cast-shadow />

        <SceneObject
          v-for="item in items"
          :key="item.id"
          :item="item"
          :paint="paintMap[item.id]"
        />

        <DropRaycaster @ready="onRaycasterReady" />
        <TresGridHelper :args="[10, 10]" />
      </TresCanvas>
    </Suspense>

    <!-- Módosított HTML struktúra az animációhoz -->
    <div class="canvas-hint">
      <span class="hint-icon">?</span>
      <span class="hint-text">Drag a color or texture onto any object to paint it</span>
    </div>
  </div>
</template>

<style scoped>
.canvas-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  transition: box-shadow 0.2s ease;
}

.canvas-wrapper.is-drag-over {
  box-shadow: inset 0 0 0 3px var(--accent-green);
}

/* --- AZ EXPANDÁLÓ KAPSZULA (ALAP ÁLLAPOT) --- */
.canvas-hint {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  
  /* Kezdeti méretek (Tökéletes kör) */
  width: 44px;
  height: 44px;
  padding: 5px;
  box-sizing: border-box;
  
  /* Üveg hatás */
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: 22px; 
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  
  cursor: pointer;
  overflow: hidden; /* Fontos: Ez rejti el a kilógó szöveget! */
  transition: width 0.4s cubic-bezier(0.25, 1, 0.5, 1);
  
  /* FIGYELEM: A pointer-events: none-t kivettük, hogy érezze az egeret! */
}

/* --- KAPSZULA HOVER ÁLLAPOT --- */
.canvas-hint:hover {
  width: 350px; /* Kinyúlik, hogy kiférjen az angol mondat */
}

/* --- A ZÖLD KÉRDŐJEL IKON --- */
.hint-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent-green);
  color: white;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  flex-shrink: 0;
  animation: pulse-ring 2s infinite;
}

.canvas-hint:hover .hint-icon {
  animation: none;
}

.hint-text {
  white-space: nowrap;
  opacity: 0;
  font-size: 0.8rem;
  color: var(--text-muted);
  padding-left: 12px;
  transition: opacity 0.3s ease 0.1s;
}

.canvas-hint:hover .hint-text {
  opacity: 1;
}
.canvas-hint:hover .hint-icon {
  display: none;
}

@keyframes pulse-ring {
  0% { box-shadow: 0 0 0 0 rgba(74, 93, 78, 0.6); }
  70% { box-shadow: 0 0 0 6px rgba(74, 93, 78, 0); }
  100% { box-shadow: 0 0 0 0 rgba(74, 93, 78, 0); }
}
</style>