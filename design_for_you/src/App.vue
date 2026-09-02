<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import * as THREE from 'three'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'

const appMode = ref('interior') 

const targetOptions = computed(() => {
  if (appMode.value === 'interior') {
    return [
      { id: 'wall', label: 'Room Wall' },
      { id: 'bed', label: 'Bed Linens' },
      { id: 'table', label: 'Wooden Table' }
    ]
  } else {
    return [
      { id: 'shirt', label: 'T-Shirt' },
      { id: 'pants', label: 'Trousers' },
      { id: 'shoes', label: 'Shoes' }
    ]
  }
})

const activeTarget = ref('wall')
watch(appMode, (newMode) => {
  activeTarget.value = newMode === 'interior' ? 'wall' : 'shirt'
})

const activePaletteName = ref('vibrant') 

const palettes = {
  vibrant: ['#03c4a6', '#c4039f', '#197e04', '#2c7cf5', '#c40320', '#db7de0', '#00c0f4', '#e974c5', '#0384c4', '#d75179', '#b222a8'],
  pastel: ['#b3e9ca', '#cfe2ff', '#f5f4a6', '#fee1a2', '#ffcece', '#cca3d2', '#e0d6bf', '#b2b2b2'],
  elegant: ['#007563', '#830143', '#9cf093', '#566563', '#005a4c', '#043887', '#b97a00', '#6c1313', '#4e2099']
}
const currentColors = computed(() => palettes[activePaletteName.value])

const textureLoader = new THREE.TextureLoader()
const objectStyles = ref({
  wall:  { type: 'color', value: '#e0d6bf', texture: null },
  bed:   { type: 'color', value: '#cfe2ff', texture: null },
  table: { type: 'color', value: '#b97a00', texture: null },
  shirt: { type: 'color', value: '#03c4a6', texture: null },
  pants: { type: 'color', value: '#043887', texture: null },
  shoes: { type: 'color', value: '#566563', texture: null }
})

const applyColor = (hexCode) => {
  objectStyles.value[activeTarget.value] = { type: 'color', value: hexCode, texture: null }
}

const applyTexture = (imgUrl) => {
  textureLoader.load(imgUrl, (loadedTexture) => {
    // Tiling beállítása
    loadedTexture.wrapS = THREE.RepeatWrapping
    loadedTexture.wrapT = THREE.RepeatWrapping
    loadedTexture.repeat.set(2, 2)
    
    loadedTexture.colorSpace = THREE.SRGBColorSpace
    
    objectStyles.value[activeTarget.value] = { type: 'texture', value: '#fff', texture: loadedTexture }
  })
}

const textures = ref([
  {
    id: 'local_tile',
    name: 'Tiled Floor',
    thumb: '/textures/tiled_floor_001.jpg',
    image: '/textures/tiled_floor_001.jpg' 
  },
  {
    id: 'local_floor',
    name: 'Floor Diffuse',
    thumb: '/textures/flour_diff_4k.jpg',
    image: '/textures/flour_diff_4k.jpg'
  },
  {
    id: 'local_fabric_pattern',
    name: 'Fabric Pattern',
    thumb: '/textures/fabric_pattern_07_col_1_1k.png',
    image: '/textures/fabric_pattern_07_col_1_1k.png'
  },
  {
    id: 'local_floral_jacquard',
    name: 'Floral Jacquard',
    thumb: '/textures/floral_jacquard_diff_1k.jpg',
    image: '/textures/floral_jacquard_diff_1k.jpg'
  },
  {
    id: 'local_velour_velvet',
    name: 'Velour Velvet',
    thumb: '/textures/velour_velvet_diff_1k.jpg',
    image: '/textures/velour_velvet_diff_1k.jpg'
  },
  {
    id: 'local_velour_velvet_spec_ior',
    name: 'Velour Velvet Specular IOR',
    thumb: '/textures/velour_velvet_spec_ior_1k.png',
    image: '/textures/velour_velvet_spec_ior_1k.png'
  }
])

const fetchTextures = async () => {
  try {
    const res = await fetch('https://api.polyhaven.com/assets?t=textures&c=fabric')
    const data = await res.json()
    
    const apiTextures = Object.keys(data).slice(0, 6).map(key => ({
      id: key,
      name: data[key].name,
      thumb: `https://cdn.polyhaven.com/asset_img/thumbs/${key}.png`,
      image: `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/${key}/${key}_diff_1k.jpg`
    }))
    
    textures.value = [...textures.value, ...apiTextures]
  } catch (err) {
    console.error("API hiba:", err)
  }
}

onMounted(() => {
  fetchTextures()
})
</script>

<template>
  <div class="designer-layout">
    
    <div class="mode-switcher">
      <button 
        :class="['mode-btn', { active: appMode === 'interior' }]" 
        @click="appMode = 'interior'">
        Interior Design
      </button>
      <button 
        :class="['mode-btn', { active: appMode === 'clothing' }]" 
        @click="appMode = 'clothing'">
        Clothing
      </button>
    </div>

    <aside class="sidebar">
      <header class="sidebar-header">
        <h1 class="brand-title">Design <span class="math-italic">Studio</span></h1>
        <p class="subtitle">Customize your {{ appMode === 'interior' ? 'space' : 'style' }}</p>
      </header>
      
      <div class="sidebar-content">
        <div class="panel">
          <h3 class="panel-title">1. Select Target</h3>
          <select v-model="activeTarget" class="modern-select">
            <option v-for="opt in targetOptions" :key="opt.id" :value="opt.id">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <div class="panel">
          <h3 class="panel-title">2. Choose Palette</h3>
          <select v-model="activePaletteName" class="modern-select">
            <option value="vibrant">Vibrant & Pop-Art</option>
            <option value="pastel">Soft Pastel</option>
            <option value="elegant">Deep Elegant</option>
          </select>
          
          <div class="swatch-grid">
            <button 
              v-for="color in currentColors" 
              :key="color"
              class="swatch color-swatch"
              :style="{ backgroundColor: color }"
              @click="applyColor(color)"
              :title="color"
            ></button>
          </div>
        </div>

        <div class="panel">
          <h3 class="panel-title">3. Apply Materials</h3>
          <div v-if="textures.length === 2" class="loading-text">Fetching more from API...</div>
          <div class="swatch-grid texture-grid">
            <button 
              v-for="tex in textures" 
              :key="tex.id" 
              class="swatch texture-swatch"
              :style="{ backgroundImage: `url(${tex.image})` }"
              @click="applyTexture(tex.image)"
              :title="tex.name"
            ></button>
          </div>
        </div>
      </div>
    </aside>

    <!-- 3D CANVAS -->
    <main class="canvas-container">
      <Suspense>
        <TresCanvas clear-color="#e8e5df">
          <TresPerspectiveCamera :position="[5, 4, 7]" :look-at="[0, 1, 0]" />
          <OrbitControls />
          
          <TresAmbientLight :intensity="0.7" />
          <TresDirectionalLight :position="[5, 10, 5]" :intensity="1" cast-shadow />

          <!-- INTERIOR Mode -->
          <TresGroup v-if="appMode === 'interior'">
            <TresMesh :position="[0, 2, -2]">
              <TresBoxGeometry :args="[8, 4, 0.2]" />
              <TresMeshStandardMaterial v-if="objectStyles.wall.type === 'color'" :color="objectStyles.wall.value" />
              <TresMeshStandardMaterial v-else :map="objectStyles.wall.texture" />
            </TresMesh>
            <TresMesh :position="[1.5, 0.5, 1]">
              <TresBoxGeometry :args="[2, 1, 1]" />
              <TresMeshStandardMaterial v-if="objectStyles.table.type === 'color'" :color="objectStyles.table.value" />
              <TresMeshStandardMaterial v-else :map="objectStyles.table.texture" :roughness="0.7"/>
            </TresMesh>
            <TresMesh :position="[-1.5, 0.3, 0.5]">
              <TresBoxGeometry :args="[2.5, 0.6, 3.5]" />
              <TresMeshStandardMaterial v-if="objectStyles.bed.type === 'color'" :color="objectStyles.bed.value" />
              <TresMeshStandardMaterial v-else :map="objectStyles.bed.texture" />
            </TresMesh>
          </TresGroup>

          <!-- CLOTHING Mode (Placeholders) -->
          <TresGroup v-else>
            <!-- Shirt -->
            <TresMesh :position="[0, 3, 0]">
              <TresCylinderGeometry :args="[1.2, 1.2, 2.5, 32]" />
              <TresMeshStandardMaterial v-if="objectStyles.shirt.type === 'color'" :color="objectStyles.shirt.value" />
              <TresMeshStandardMaterial v-else :map="objectStyles.shirt.texture" />
            </TresMesh>
            <!-- Pants -->
            <TresMesh :position="[0, 0.5, 0]">
              <TresBoxGeometry :args="[1.4, 2.5, 1]" />
              <TresMeshStandardMaterial v-if="objectStyles.pants.type === 'color'" :color="objectStyles.pants.value" />
              <TresMeshStandardMaterial v-else :map="objectStyles.pants.texture" />
            </TresMesh>
            <!-- Shoe  -->
            <TresMesh :position="[0, -1, 0.2]">
              <TresBoxGeometry :args="[1.6, 0.4, 1.4]" />
              <TresMeshStandardMaterial v-if="objectStyles.shoes.type === 'color'" :color="objectStyles.shoes.value" />
              <TresMeshStandardMaterial v-else :map="objectStyles.shoes.texture" />
            </TresMesh>
          </TresGroup>
          
          <TresGridHelper :args="[10, 10]" />
        </TresCanvas>
      </Suspense>
    </main>

  </div>
</template>