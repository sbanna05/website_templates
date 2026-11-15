// Turns a block's state into three.js objects: geometry from the catalogue
// definition, and one material per part role driven by the block's paint.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { getDefinition } from '../config/catalog'
import { finishById } from '../config/finishes'
import { mixHex, shade, tint } from './color'

const DEFAULT_BEVEL = 0.008

/**
 * Rewrites a rounded box's UVs to metres measured along each face, so a
 * texture keeps the same scale on a 30 cm drawer and a 6 m wall.
 * RoundedBoxGeometry is non-indexed and stores its six faces as equal,
 * consecutive runs of vertices in the order +x, -x, +y, -y, +z, -z.
 */
function useMetricBoxUvs(geometry) {
  const position = geometry.attributes.position
  const uv = geometry.attributes.uv
  const verticesPerFace = position.count / 6
  for (let vertex = 0; vertex < position.count; vertex += 1) {
    const axis = Math.floor(vertex / verticesPerFace / 2)
    const [x, y, z] = [position.getX(vertex), position.getY(vertex), position.getZ(vertex)]
    if (axis === 0) uv.setXY(vertex, z, y)
    else if (axis === 1) uv.setXY(vertex, x, z)
    else uv.setXY(vertex, x, y)
  }
}

/**
 * Metric UVs for a cylinder. The wall wraps by circumference and height;
 * the caps are projected flat from above, so a round tabletop or podium
 * shows its pattern undistorted. CylinderGeometry groups are wall, top, bottom.
 */
function useMetricCylinderUvs(geometry, part) {
  const [sx, , sz] = part.scale ?? [1, 1, 1]
  const position = geometry.attributes.position
  const uv = geometry.attributes.uv
  const index = geometry.index
  const circumference = Math.PI * (part.rt + part.rb) * ((sx + sz) / 2)
  const done = new Set()
  for (const group of geometry.groups) {
    for (let i = group.start; i < group.start + group.count; i += 1) {
      const vertex = index.getX(i)
      if (done.has(vertex)) continue
      done.add(vertex)
      if (group.materialIndex === 0) uv.setXY(vertex, uv.getX(vertex) * circumference, uv.getY(vertex) * part.h)
      else uv.setXY(vertex, position.getX(vertex) * sx, position.getZ(vertex) * sz)
    }
  }
  geometry.clearGroups()
}

function scaleUvs(geometry, scaleU, scaleV) {
  const uv = geometry.attributes.uv
  for (let i = 0; i < uv.count; i += 1) uv.setXY(i, uv.getX(i) * scaleU, uv.getY(i) * scaleV)
}

function createGeometry(part) {
  if (part.shape === 'box') {
    const [w, h, d] = part.size
    const radius = Math.min(part.radius ?? DEFAULT_BEVEL, Math.min(w, h, d) / 2)
    const geometry = new RoundedBoxGeometry(w, h, d, 3, radius)
    useMetricBoxUvs(geometry)
    return geometry
  }
  if (part.shape === 'cyl') {
    const geometry = new THREE.CylinderGeometry(part.rt, part.rb, part.h, 48)
    useMetricCylinderUvs(geometry, part)
    return geometry
  }
  const geometry = new THREE.SphereGeometry(part.r, 40, 28)
  scaleUvs(geometry, 2 * Math.PI * part.r, Math.PI * part.r)
  return geometry
}

/** One material per role. The same set is shared by every part of a block. */
export function createMaterials() {
  return {
    main: new THREE.MeshPhysicalMaterial(),
    soft: new THREE.MeshPhysicalMaterial(),
    trim: new THREE.MeshStandardMaterial({ roughness: 0.7 }),
    top: new THREE.MeshStandardMaterial({ roughness: 0.35 }),
    metal: new THREE.MeshStandardMaterial({ color: '#b9b2a4', metalness: 1, roughness: 0.32 })
  }
}

/** Applies a block's colour, finish and (already loaded) texture map to its materials. */
export function paintMaterials(materials, block, map = null) {
  const finish = finishById[block.finish] ?? finishById.satin
  materials.main.color.set(block.color)
  materials.soft.color.set(tint(block.color, 0.3))
  materials.trim.color.set(shade(block.color, 0.45))
  materials.top.color.set(mixHex(block.color, '#efeae0', 0.88))

  for (const material of [materials.main, materials.soft]) {
    // Gaining or losing a map changes the shader, so the material must recompile.
    if (Boolean(material.map) !== Boolean(map)) material.needsUpdate = true
    material.map = map
    material.roughness = finish.roughness
    material.clearcoat = finish.clearcoat
    material.clearcoatRoughness = 0.25
  }
}

/** Builds the meshes for `block` at its current size, sharing `materials`. */
export function buildMeshes(block, materials) {
  const parts = getDefinition(block.type).build(block.w, block.h, block.d)
  return parts.map((part) => {
    const mesh = new THREE.Mesh(createGeometry(part), materials[part.role])
    mesh.position.set(...part.pos)
    if (part.rot) mesh.rotation.set(...part.rot)
    if (part.scale) mesh.scale.set(...part.scale)
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  })
}

export function disposeMeshes(meshes) {
  for (const mesh of meshes) {
    mesh.removeFromParent()
    mesh.geometry.dispose()
  }
}

export function disposeMaterials(materials) {
  for (const material of Object.values(materials)) material.dispose()
}

/** Studio lighting shared by the main view and the catalogue thumbnails. */
export function addStudioLights(scene) {
  const key = new THREE.DirectionalLight('#fff4e2', 3.1)
  // From the open side of the room and slightly behind, so shadows fall toward the viewer.
  key.position.set(5.5, 8, 2.5)
  const fill = new THREE.DirectionalLight('#cfe0ee', 0.7)
  fill.position.set(-4, 3.5, 6)
  const sky = new THREE.HemisphereLight('#ffffff', '#b9ae9e', 0.4)
  scene.add(key, fill, sky)
  return { key, fill, sky }
}
