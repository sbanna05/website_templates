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

// Az összes 3D elem állapota (mindkét módhoz)
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
    loadedTexture.wrapS = THREE.RepeatWrapping
    loadedTexture.wrapT = THREE.RepeatWrapping
    loadedTexture.repeat.set(2, 2)
    objectStyles.value[activeTarget.value] = { type: 'texture', value: '#fff', texture: loadedTexture }
  })
}

const textures = ref([])

const fetchTextures = async () => {
  try {
    const res = await fetch('https://api.polyhaven.com/assets?t=textures')
    const data = await res.json()
    textures.value = Object.keys(data).slice(0, 8).map(key => ({
      id: key,
      name: data[key].name,
      image: `https://cdn.polyhaven.com/asset_img/thumbs/${key}.png`
    }))
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
          <div v-if="textures.length === 0" class="loading-text">Loading materials...</div>
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
        <TresCanvas clear-color="#e8e5df" window-size>
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

<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=Inter:wght@300;400;500&display=swap');

:root {
  --glass-bg: rgba(245, 242, 235, 0.65);
  --glass-border: rgba(255, 255, 255, 0.4);
  --text-main: #3a403d;
  --text-muted: #74807a;
  --accent-green: #4A5D4E;
  --accent-hover: #3d4d40;
}

body {
  margin: 0;
  font-family: 'Inter', sans-serif;
  color: var(--text-main);
  overflow: hidden; 
}

/* Fő konténer */
.designer-layout {
  position: relative;
  width: 100vw;
  height: 100vh;
}

.mode-switcher {
  position: absolute;
  top: 2rem;
  right: 2rem;
  z-index: 20;
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: 30px;
  padding: 0.4rem;
  display: flex;
  gap: 0.5rem;
  box-shadow: 0 8px 32px rgba(0,0,0,0.08);
}

.mode-btn {
  background: transparent;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 20px;
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.3s ease;
}

.mode-btn.active {
  background: var(--accent-green);
  color: #fff;
  box-shadow: 0 4px 12px rgba(74, 93, 78, 0.3);
}

.sidebar {
  position: absolute;
  top: 0;
  left: 0;
  width: 400px;
  height: 100vh;
  background-color: var(--glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-right: 1px solid var(--glass-border);
  box-shadow: 4px 0 32px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  z-index: 10;
}

.sidebar-header {
  padding: 2.5rem 2rem 1.5rem 2rem;
  border-bottom: 1px solid var(--glass-border);
}

.brand-title {
  font-family: 'Inter', sans-serif;
  font-size: 2.4rem;
  font-weight: 300;
  margin: 0 0 0.2rem 0;
  letter-spacing: -1px;
}

.math-italic {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-weight: 600;
  color: var(--accent-green);
}

.subtitle {
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 2px;
  color: var(--text-muted);
  margin: 0;
}

.sidebar-content {
  padding: 2rem;
  overflow-y: auto;
}

.panel {
  margin-bottom: 2.5rem;
}

.panel-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.4rem;
  font-style: italic;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--accent-green);
}

.modern-select {
  width: 100%;
  padding: 0.8rem 1rem;
  border: 1px solid rgba(74, 93, 78, 0.2);
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 0.95rem;
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.5);
  outline: none;
  margin-bottom: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.modern-select:hover, .modern-select:focus {
  border-color: var(--accent-green);
  background: rgba(255, 255, 255, 0.8);
}

.swatch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(45px, 1fr));
  gap: 12px;
}

.swatch {
  aspect-ratio: 1;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
  box-shadow: 0 4px 10px rgba(0,0,0,0.06);
}

.swatch:hover {
  transform: scale(1.15) translateY(-2px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.12);
  border-color: #fff;
}

.texture-swatch {
  background-size: cover;
  background-position: center;
  border-radius: 12px;
}

.canvas-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1; 
}
</style>