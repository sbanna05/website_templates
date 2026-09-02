<script setup>
import { ref } from 'vue'
import * as THREE from 'three'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'

const textureLoader = new THREE.TextureLoader()
const woodTexture = ref(null)

const textureUrl = 'https://images.unsplash.com/photo-1598928308466-9e631ec1b5cb?auto=format&fit=crop&w=512&q=80'

textureLoader.load(textureUrl, (tex) => {
  // 2. Textúra ismétlődés (Tiling) bekapcsolása
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  
  // 3. Minta sűrűségének beállítása (X és Y irányban)
  tex.repeat.set(2, 4) // X tengelyen 2x, Y tengelyen 4x ismétlődik
  
  // A színteret érdemes sRGB-re állítani a helyes színekért
  tex.colorSpace = THREE.SRGBColorSpace 

  woodTexture.value = tex
})
</script>

<template>
  <div style="height: 100vh; width: 100vw;">
    <TresCanvas clear-color="#222">
      <TresPerspectiveCamera :position="[3, 3, 3]" />
      <OrbitControls />
      
      <TresAmbientLight :intensity="1.5" />
      <TresDirectionalLight :position="[5, 5, 5]" :intensity="2" />

      <TresMesh :position="[0, 1, 0]">
        <TresCylinderGeometry :args="[1, 1, 2, 32]" />
        
        <TresMeshStandardMaterial 
          v-if="woodTexture" 
          :map="woodTexture" 
          :roughness="0.8" 
        />
      </TresMesh>
      
      <TresGridHelper />
    </TresCanvas>
  </div>
</template>