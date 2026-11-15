// Renders a small picture of every catalogue block, so the library shows
// the real product instead of an icon. Uses its own short-lived WebGL
// context, released as soon as the images are captured.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { createBlock } from '../config/catalog'
import { addStudioLights, buildMeshes, createMaterials, disposeMaterials, disposeMeshes, paintMaterials } from './blockMesh'
import { cloneForBlock, loadTexture } from './textureStore'

const SIZE = 176
const VIEW_DIRECTION = new THREE.Vector3(1, 0.72, 1.3).normalize()

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/**
 * @param {Array<{ type: string }>} definitions catalogue entries to draw
 * @param {(type: string, dataUrl: string) => void} onThumbnail called as each image is ready
 */
export async function renderThumbnails(definitions, onThumbnail) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(2)
  renderer.setSize(SIZE, SIZE)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NeutralToneMapping

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.6
  pmrem.dispose()
  addStudioLights(scene)

  const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 60)
  const bounds = new THREE.Box3()
  const sphere = new THREE.Sphere()

  try {
    for (const definition of definitions) {
      const block = createBlock(definition.type, 'thumbnail')
      const materials = createMaterials()
      let map = null
      if (block.texture) {
        const base = await loadTexture(block.texture).catch(() => null)
        if (base) map = cloneForBlock(base, block.texture, block.textureScale)
      }
      paintMaterials(materials, block, map)

      const group = new THREE.Group()
      const meshes = buildMeshes(block, materials)
      group.add(...meshes)
      scene.add(group)

      bounds.setFromObject(group).getBoundingSphere(sphere)
      const distance = (sphere.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.02
      camera.position.copy(sphere.center).addScaledVector(VIEW_DIRECTION, distance)
      camera.lookAt(sphere.center)

      renderer.render(scene, camera)
      onThumbnail(definition.type, renderer.domElement.toDataURL('image/webp', 0.9))

      scene.remove(group)
      disposeMeshes(meshes)
      disposeMaterials(materials)
      map?.dispose()
      // Yield between blocks so the main view stays responsive while these render.
      await nextFrame()
    }
  } finally {
    scene.environment.dispose()
    renderer.dispose()
    renderer.forceContextLoss()
  }
}
