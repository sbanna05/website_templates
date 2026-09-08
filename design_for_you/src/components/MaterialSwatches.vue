<script setup>
import { ref, onMounted } from 'vue'
import { startTextureDrag } from '../composables/useDragPayload'

const emit = defineEmits(['apply-texture'])

const textures = ref([
  { id: 'local_tile', name: 'Tiled Floor', image: '/textures/tiled_floor_001.jpg' },
  { id: 'local_floor', name: 'Floor Diffuse', image: '/textures/flour_diff_4k.jpg' },
  { id: 'local_fabric_pattern', name: 'Fabric Pattern', image: '/textures/fabric_pattern_07_col_1_1k.png' },
  { id: 'local_floral_jacquard', name: 'Floral Jacquard', image: '/textures/floral_jacquard_diff_1k.jpg' },
  { id: 'local_velour_velvet', name: 'Velour Velvet', image: '/textures/velour_velvet_diff_1k.jpg' },
  { id: 'local_velour_velvet_spec_ior', name: 'Velour Velvet Specular IOR', image: '/textures/velour_velvet_spec_ior_1k.png' }
])
const loadingMore = ref(false)

async function fetchTextures() {
  loadingMore.value = true
  try {
    const res = await fetch('https://api.polyhaven.com/assets?t=textures&c=fabric')
    const data = await res.json()
    const apiTextures = Object.keys(data).slice(0, 6).map((key) => ({
      id: key,
      name: data[key].name,
      image: `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/${key}/${key}_diff_1k.jpg`
    }))
    textures.value = [...textures.value, ...apiTextures]
  } catch (err) {
    console.error('Texture API error:', err)
  } finally {
    loadingMore.value = false
  }
}

onMounted(fetchTextures)

function onDragStart(event, imageUrl) {
  startTextureDrag(event, imageUrl)
}
</script>

<template>
  <div>
    <div v-if="loadingMore" class="loading-text">Fetching more from API...</div>
    <div class="swatch-grid texture-grid">
      <button
        v-for="tex in textures"
        :key="tex.id"
        type="button"
        class="swatch texture-swatch"
        :style="{ backgroundImage: `url(${tex.image})` }"
        draggable="true"
        @dragstart="onDragStart($event, tex.image)"
        @click="emit('apply-texture', tex.image)"
        :title="tex.name"
      ></button>
    </div>
  </div>
</template>
