// Surface finishes a block can have. `roughness` and `clearcoat` feed the
// physically based material in src/studio/blockMesh.js.

export const FINISHES = [
  { id: 'matte', label: 'Matte', roughness: 0.94, clearcoat: 0 },
  { id: 'satin', label: 'Satin', roughness: 0.6, clearcoat: 0.08 },
  { id: 'gloss', label: 'Gloss', roughness: 0.2, clearcoat: 0.8 }
]

export const finishById = Object.fromEntries(FINISHES.map((finish) => [finish.id, finish]))
