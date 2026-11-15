// Loads each material's base texture once and hands out cheap per-block
// clones (a clone shares the image but has its own repeat).
import * as THREE from 'three'
import { textureById } from '../config/textures'
import { drawProceduralTexture } from './proceduralTextures'

const loader = new THREE.TextureLoader()
const cache = new Map()

function prepare(texture) {
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

/** Resolves with the shared base texture for `id`. Rejects if the image fails to load. */
export function loadTexture(id) {
  if (!cache.has(id)) {
    const record = textureById[id]
    const pending = !record
      ? Promise.reject(new Error(`Unknown texture "${id}"`))
      : record.kind === 'procedural'
        ? Promise.resolve(prepare(new THREE.CanvasTexture(drawProceduralTexture(id))))
        : loader.loadAsync(record.url).then(prepare)
    // A failed load is forgotten so picking the texture again retries it.
    pending.catch(() => cache.delete(id))
    cache.set(id, pending)
  }
  return cache.get(id)
}

/**
 * A clone of `base` sized so one repeat covers the texture's real-world
 * width times `scale`. Block UVs are in metres (see blockMesh.js).
 */
export function cloneForBlock(base, id, scale) {
  const clone = base.clone()
  const repeat = 1 / (textureById[id].tileMeters * scale)
  clone.repeat.set(repeat, repeat)
  clone.needsUpdate = true
  return clone
}
