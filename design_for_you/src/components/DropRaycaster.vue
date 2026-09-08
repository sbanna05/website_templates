<script setup>
// Lives inside <TresCanvas>. Exposes a `pick(ndcX, ndcY)` function to its
// parent via the `ready` event, so a drop event anywhere over the canvas
// wrapper can be turned into "which object did the cursor land on".
//
// Requires @tresjs/core v4+ (useTresContext). If your installed version
// exposes context differently, swap this composable for the equivalent one.
import { onMounted } from 'vue'
import * as THREE from 'three'
import { useTresContext } from '@tresjs/core'

const emit = defineEmits(['ready'])
const { camera, scene } = useTresContext()
const raycaster = new THREE.Raycaster()

function pick(ndcX, ndcY) {
  if (!camera.value || !scene.value) return null
  raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera.value)
  const hits = raycaster.intersectObjects(scene.value.children, true)
  if (!hits.length) return null

  // Walk up from the hit mesh until we find the object carrying our
  // targetId tag (set on the wrapping TresGroup in SceneObject.vue).
  let obj = hits[0].object
  while (obj && !obj.userData?.targetId) {
    obj = obj.parent
  }
  return obj?.userData?.targetId ?? null
}

onMounted(() => emit('ready', pick))
</script>

<template></template>
