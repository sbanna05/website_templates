<script setup>
import { ref, watch } from 'vue'
import * as THREE from 'three'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls, TransformControls } from '@tresjs/cientos'

const textureScale = ref(2)
const textureLoader = new THREE.TextureLoader()
const myTexture = ref(null)

// Textúra betöltése és az ismétlődés (tiling) engedélyezése
textureLoader.load('https://cdn.polyhaven.com/asset_img/thumbs/wood_cabinet_worn_long.png', (tex) => {
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  // Kezdeti sűrűség beállítása
  tex.repeat.set(textureScale.value, textureScale.value)
  myTexture.value = tex
})

// Figyeljük a Vue csúszkát, és azonnal frissítjük a textúra sűrűségét a 3D térben
watch(textureScale, (newScale) => {
  if (myTexture.value) {
    myTexture.value.repeat.set(newScale, newScale)
  }
})
</script>

<template>
  <div style="height: 100vh; width: 100vw; position: relative;">
    
    <!-- UI: Textúra sűrűség (Scale) csúszka -->
    <div style="position: absolute; top: 20px; left: 20px; z-index: 10; background: rgba(255,255,255,0.9); padding: 1rem; border-radius: 8px;">
      <label style="display: block; margin-bottom: 0.5rem; font-family: sans-serif;">
        Minta sűrűsége: {{ textureScale }}x
      </label>
      <input type="range" v-model="textureScale" min="0.5" max="10" step="0.5" />
    </div>

    <TresCanvas clear-color="#e8e5df" window-size>
      <TresPerspectiveCamera :position="[5, 4, 5]" />
      
      <!-- A make-default fontos, hogy a TransformControls átvehesse az irányítást húzáskor -->
      <OrbitControls make-default />
      
      <TresAmbientLight :intensity="0.6" />
      <TresDirectionalLight :position="[5, 10, 5]" :intensity="1" />

      <!-- TransformControls: Unity-szerű mozgató nyilakat tesz a benne lévő tárgyra -->
      <TransformControls mode="translate">
        <TresMesh :position="[0, 1, 0]">
          <TresBoxGeometry :args="[2, 2, 2]" />
          <!-- A textúrát csak akkor töltjük be, ha a myTexture már nem null -->
          <TresMeshStandardMaterial v-if="myTexture" :map="myTexture" />
        </TresMesh>
      </TransformControls>
      
      <TresGridHelper :args="[10, 10]" />
    </TresCanvas>
  </div>
</template>