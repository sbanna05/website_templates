// Placement rules shared by pointer dragging (engine.js) and keyboard or
// inspector edits (useStudio.js). Kept free of three.js so the interface
// can load before the 3D library does.
import { STAGE_BOUNDS } from '../config/catalog'

export const SNAP_STEP = 0.05

/** Rounds to the grid, and to whole millimetres so saved positions stay tidy. */
export const snapToGrid = (value) => Math.round(Math.round(value / SNAP_STEP) * SNAP_STEP * 1000) / 1000

/** Half-extents of a block's footprint on the floor after its rotation. */
function footprint(block) {
  const angle = (block.rot * Math.PI) / 180
  const cos = Math.abs(Math.cos(angle))
  const sin = Math.abs(Math.sin(angle))
  return { x: (cos * block.w + sin * block.d) / 2, z: (sin * block.w + cos * block.d) / 2 }
}

/** Keeps a block's whole footprint on the stage. Oversized blocks are centred. */
export function clampToStage(block, x, z, mode) {
  const bounds = STAGE_BOUNDS[mode]
  const half = footprint(block)
  const clampAxis = (value, min, max, extent) =>
    max - min < extent * 2 ? (min + max) / 2 : Math.min(max - extent, Math.max(min + extent, value))
  return {
    x: clampAxis(x, bounds.minX, bounds.maxX, half.x),
    z: clampAxis(z, bounds.minZ, bounds.maxZ, half.z)
  }
}
