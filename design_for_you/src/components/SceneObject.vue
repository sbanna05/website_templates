<script setup>
// The GLTFModel import only matters once `item.modelUrl` is actually set —
// keeping it imported here means the real-model path already works the
// day you fill in a URL in src/config/sceneObjects.js.
import { GLTFModel } from '@tresjs/cientos'

defineProps({
  item: { type: Object, required: true }, // one entry from sceneConfig
  paint: { type: Object, required: true } // { color: '#hex', texture: THREE.Texture|null }
})
</script>

<template>
  <!-- userData.targetId is how the drop-to-paint raycaster (DropRaycaster.vue)
       figures out which object was dropped on, for both the mock mesh below
       and any real, deeply-nested GLTF mesh once one is loaded. -->
  <TresGroup :position="item.mock.position" :user-data="{ targetId: item.id }">
    <!-- MOCK PLACEHOLDER: active while item.modelUrl is null -->
    <TresMesh v-if="!item.modelUrl">
      <TresBoxGeometry v-if="item.mock.geometry === 'box'" :args="item.mock.args" />
      <TresCylinderGeometry v-else-if="item.mock.geometry === 'cylinder'" :args="item.mock.args" />

      <!--
        `color` and `map` are always bound together: three.js multiplies a
        texture's own pixels by `material.color`, so this is a real
        tint-over-texture material, not an either/or toggle. That's exactly
        what "a normal shirt with an existing texture, in a color from my
        own color bank" needs — pick a texture with a light/neutral base
        (not a strongly saturated one) and any color tints it cleanly.

        The :key forces this node to remount when a texture is added or
        removed. Three.js needs a shader recompile when a material gains or
        loses its first map, and toggling the prop in place doesn't reliably
        trigger that — recreating the node sidesteps it entirely.
      -->
      <TresMeshStandardMaterial
        :key="paint.texture ? 'textured' : 'flat'"
        :color="paint.color"
        :map="paint.texture"
        :roughness="0.65"
      />
    </TresMesh>

    <!-- FUTURE REAL MODEL SLOT: takes over automatically once modelUrl is set.
         No other file needs to change to enable this branch. -->
    <Suspense v-else>
      <GLTFModel :path="item.modelUrl" />
    </Suspense>
    <!--
      TODO when wiring a real model: applying `paint` to a loaded GLTF means
      traversing its meshes and setting each material's color/map, since a
      real asset may have multiple material slots (e.g. body vs. cuffs vs.
      buttons). A common approach:

        loadedGltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.material.color.set(paint.color)
            child.material.map = paint.texture
            child.material.needsUpdate = true
          }
        })

      Left commented out because it depends on how your real models are
      authored (one shared material vs. per-part materials) — see the
      README for asset-sourcing notes on picking models that work well here.
    -->
  </TresGroup>
</template>
