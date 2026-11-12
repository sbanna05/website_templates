// The block catalogue: everything that can be placed in a scene.
//
// Sizes are metres. Each definition has a `build(w, h, d)` that returns the
// primitive parts for that size, positioned around the block's base centre
// (x and z centred, y = 0 at the bottom). Rebuilding from real dimensions on
// every resize keeps details honest: plinths stay 10 cm tall and a wider
// cabinet gains doors instead of stretching one.
//
// Part roles decide how a part takes the block's paint (see engine.js):
//   main  - the chosen colour and texture
//   soft  - a lighter tint of it (cushions, pillows, linings)
//   trim  - a darker shade of it (plinths, legs, bands)
//   top   - pale stone derived from it (worktops)
//   metal - brushed metal, ignores the paint

const box = (size, pos, role = 'main', extra = {}) => ({ shape: 'box', size, pos, role, ...extra })
const cyl = (rt, rb, h, pos, role = 'main', extra = {}) => ({ shape: 'cyl', rt, rb, h, pos, role, ...extra })
const sphere = (r, pos, role = 'main', extra = {}) => ({ shape: 'sphere', r, pos, role, ...extra })

const PLINTH = 0.1
const WORKTOP = 0.04
const FRONT = 0.02
const GAP = 0.004

/** Splits a cabinet front into evenly sized door or drawer panels. */
function fronts(w, bottom, top, d, { columns, rows = 1 }) {
  const parts = []
  const panelW = (w - GAP * (columns + 1)) / columns
  const panelH = (top - bottom - GAP * (rows + 1)) / rows
  for (let col = 0; col < columns; col += 1) {
    for (let row = 0; row < rows; row += 1) {
      const x = -w / 2 + GAP + panelW / 2 + col * (panelW + GAP)
      const y = bottom + GAP + panelH / 2 + row * (panelH + GAP)
      parts.push(box([panelW, panelH, FRONT], [x, y, d / 2 + FRONT / 2], 'main'))
      // Drawers get a horizontal pull; doors get a vertical one on the opening edge.
      const handle = rows > 1
        ? box([Math.min(0.16, panelW * 0.4), 0.012, 0.022], [x, y + panelH / 2 - 0.05, d / 2 + FRONT + 0.011], 'metal')
        : box([0.012, Math.min(0.18, panelH * 0.3), 0.022], [x + (col % 2 ? -1 : 1) * (panelW / 2 - 0.04), top - 0.16, d / 2 + FRONT + 0.011], 'metal')
      parts.push(handle)
    }
  }
  return parts
}

const doorColumns = (w) => Math.max(1, Math.round(w / 0.5))

function baseCabinet(w, h, d, rows = 1) {
  const bodyTop = h - WORKTOP
  return [
    box([w - 0.02, PLINTH, d - 0.08], [0, PLINTH / 2, -0.03], 'trim'),
    box([w, bodyTop - PLINTH, d], [0, (bodyTop + PLINTH) / 2, 0], 'main'),
    ...fronts(w, PLINTH, bodyTop, d, { columns: rows > 1 ? 1 : doorColumns(w), rows }),
    box([w + 0.01, WORKTOP, d + 0.05], [0, h - WORKTOP / 2, 0.015], 'top')
  ]
}

const interiorBlocks = [
  {
    type: 'base-cabinet',
    group: 'Kitchen',
    name: 'Base cabinet',
    alt: 'Floor cabinet with doors, a plinth and a stone worktop',
    size: [0.6, 0.9, 0.6],
    limits: { w: [0.3, 2.4], h: [0.7, 1.05], d: [0.4, 0.8] },
    color: '#2f5d62',
    build: (w, h, d) => baseCabinet(w, h, d)
  },
  {
    type: 'drawer-unit',
    group: 'Kitchen',
    name: 'Drawer unit',
    alt: 'Floor cabinet with three stacked drawers and a stone worktop',
    size: [0.8, 0.9, 0.6],
    limits: { w: [0.3, 1.2], h: [0.7, 1.05], d: [0.4, 0.8] },
    color: '#2f5d62',
    build: (w, h, d) => baseCabinet(w, h, d, 3)
  },
  {
    type: 'tall-unit',
    group: 'Kitchen',
    name: 'Tall unit',
    alt: 'Full-height larder cabinet with stacked doors',
    size: [0.6, 2.1, 0.6],
    limits: { w: [0.3, 1.2], h: [1.6, 2.5], d: [0.4, 0.8] },
    color: '#27323a',
    build: (w, h, d) => [
      box([w - 0.02, PLINTH, d - 0.08], [0, PLINTH / 2, -0.03], 'trim'),
      box([w, h - PLINTH, d], [0, (h + PLINTH) / 2, 0], 'main'),
      ...fronts(w, PLINTH, h, d, { columns: doorColumns(w), rows: 1 })
    ]
  },
  {
    type: 'wall-cabinet',
    group: 'Kitchen',
    name: 'Wall cabinet',
    alt: 'Shallow cabinet with doors, mounted above the worktop',
    size: [0.6, 0.7, 0.35],
    limits: { w: [0.3, 2.4], h: [0.35, 1.0], d: [0.25, 0.45] },
    elevation: 1.45,
    color: '#8fa58a',
    build: (w, h, d) => [
      box([w, h, d], [0, h / 2, 0], 'main'),
      ...fronts(w, 0, h, d, { columns: doorColumns(w), rows: 1 })
    ]
  },
  {
    type: 'island',
    group: 'Kitchen',
    name: 'Island',
    alt: 'Freestanding kitchen island with an overhanging worktop',
    size: [1.8, 0.92, 0.9],
    limits: { w: [1.0, 3.0], h: [0.8, 1.1], d: [0.6, 1.4] },
    color: '#b5653f',
    build: (w, h, d) => [
      box([w - 0.14, PLINTH, d - 0.14], [0, PLINTH / 2, 0], 'trim'),
      box([w - 0.08, h - PLINTH - 0.05, d - 0.08], [0, (h - 0.05 + PLINTH) / 2, 0], 'main'),
      box([w, 0.05, d], [0, h - 0.025, 0], 'top')
    ]
  },
  {
    type: 'shelf',
    group: 'Kitchen',
    name: 'Open shelf',
    alt: 'Floating wall shelf on two metal brackets',
    size: [0.9, 0.12, 0.25],
    limits: { w: [0.4, 2.4], h: [0.08, 0.2], d: [0.15, 0.4] },
    elevation: 1.5,
    color: '#c8a878',
    build: (w, h, d) => [
      box([w, 0.035, d], [0, h - 0.0175, 0], 'main'),
      box([0.02, h - 0.035, d * 0.8], [-w / 2 + 0.1, (h - 0.035) / 2, -d * 0.1], 'metal'),
      box([0.02, h - 0.035, d * 0.8], [w / 2 - 0.1, (h - 0.035) / 2, -d * 0.1], 'metal')
    ]
  },
  {
    type: 'sofa',
    group: 'Living',
    name: 'Sofa',
    alt: 'Low sofa with arms, a back and loose seat cushions',
    size: [2.0, 0.78, 0.92],
    limits: { w: [1.2, 3.2], h: [0.6, 1.0], d: [0.7, 1.2] },
    color: '#6b3f5b',
    texture: 'linen',
    build: (w, h, d) => {
      const arm = 0.16
      const seatTop = h * 0.52
      const seats = Math.max(1, Math.round((w - arm * 2) / 0.8))
      const seatW = (w - arm * 2 - GAP * (seats + 1)) / seats
      const cushions = Array.from({ length: seats }, (_, i) =>
        box(
          [seatW, 0.14, d - 0.26],
          [-w / 2 + arm + GAP + seatW / 2 + i * (seatW + GAP), seatTop + 0.05, 0.1],
          'soft',
          { radius: 0.04 }
        ))
      return [
        box([w - 0.06, 0.08, d - 0.1], [0, 0.04, 0], 'trim'),
        box([w, seatTop - 0.08, d], [0, 0.08 + (seatTop - 0.08) / 2, 0], 'main', { radius: 0.04 }),
        box([w, h - 0.08, 0.2], [0, 0.08 + (h - 0.08) / 2, -d / 2 + 0.1], 'main', { radius: 0.05 }),
        box([arm, h * 0.78 - 0.08, d], [-w / 2 + arm / 2, 0.08 + (h * 0.78 - 0.08) / 2, 0], 'main', { radius: 0.05 }),
        box([arm, h * 0.78 - 0.08, d], [w / 2 - arm / 2, 0.08 + (h * 0.78 - 0.08) / 2, 0], 'main', { radius: 0.05 }),
        ...cushions
      ]
    }
  },
  {
    type: 'table',
    group: 'Living',
    name: 'Dining table',
    alt: 'Rectangular table on four straight legs',
    size: [1.6, 0.75, 0.9],
    limits: { w: [0.6, 3.0], h: [0.4, 1.1], d: [0.5, 1.4] },
    color: '#c8a878',
    texture: 'oak',
    build: (w, h, d) => {
      const leg = 0.06
      const inset = 0.08
      const legs = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) =>
        box([leg, h - 0.04, leg], [sx * (w / 2 - inset), (h - 0.04) / 2, sz * (d / 2 - inset)], 'trim'))
      return [box([w, 0.04, d], [0, h - 0.02, 0], 'main'), ...legs]
    }
  },
  {
    type: 'bed',
    group: 'Living',
    name: 'Bed',
    alt: 'Double bed with a headboard, mattress and two pillows',
    size: [1.6, 0.95, 2.1],
    limits: { w: [0.9, 2.2], h: [0.7, 1.4], d: [1.9, 2.3] },
    color: '#5b7c93',
    texture: 'linen',
    build: (w, h, d) => [
      box([w, 0.28, d], [0, 0.14, 0], 'trim', { radius: 0.03 }),
      box([w, h, 0.1], [0, h / 2, -d / 2 + 0.05], 'main', { radius: 0.04 }),
      box([w - 0.08, 0.2, d - 0.16], [0, 0.38, 0.04], 'soft', { radius: 0.06 }),
      box([w * 0.4, 0.1, 0.38], [-w * 0.23, 0.53, -d / 2 + 0.36], 'soft', { radius: 0.05 }),
      box([w * 0.4, 0.1, 0.38], [w * 0.23, 0.53, -d / 2 + 0.36], 'soft', { radius: 0.05 })
    ]
  },
  {
    type: 'pouf',
    group: 'Living',
    name: 'Pouf',
    alt: 'Round upholstered footstool',
    size: [0.5, 0.42, 0.5],
    limits: { w: [0.3, 1.0], h: [0.25, 0.6], d: [0.3, 1.0] },
    color: '#c99a3b',
    texture: 'ribbed',
    build: (w, h, d) => [cyl(0.5, 0.5, h, [0, h / 2, 0], 'main', { scale: [w, 1, d] })]
  },
  {
    type: 'lamp',
    group: 'Living',
    name: 'Floor lamp',
    alt: 'Floor lamp with a metal stem and a tapered shade',
    size: [0.42, 1.6, 0.42],
    limits: { w: [0.25, 0.7], h: [1.0, 2.0], d: [0.25, 0.7] },
    color: '#e8dfcf',
    build: (w, h, d) => [
      cyl(0.32, 0.36, 0.03, [0, 0.015, 0], 'metal', { scale: [w, 1, d] }),
      cyl(0.012, 0.012, h - 0.3, [0, (h - 0.3) / 2, 0], 'metal'),
      cyl(0.32, 0.5, 0.3, [0, h - 0.15, 0], 'main', { scale: [w, 1, d] })
    ]
  },
  {
    type: 'rug',
    group: 'Living',
    name: 'Rug',
    alt: 'Flat rectangular rug',
    size: [2.2, 0.02, 1.5],
    limits: { w: [0.6, 4.0], h: [0.01, 0.05], d: [0.6, 3.0] },
    color: '#c58f87',
    texture: 'linen',
    build: (w, h, d) => [box([w, h, d], [0, h / 2, 0], 'main', { radius: 0.004 })]
  },
  {
    type: 'cube',
    group: 'Living',
    name: 'Free block',
    alt: 'Plain rounded block you can size into anything',
    size: [0.5, 0.5, 0.5],
    limits: { w: [0.05, 4.0], h: [0.05, 2.6], d: [0.05, 4.0] },
    color: '#c0553a',
    build: (w, h, d) => [box([w, h, d], [0, h / 2, 0], 'main', { radius: 0.02 })]
  }
]

// Garments are sized to wrap the mannequin defined in `fixedBlocks.outfit`.
const outfitBlocks = [
  {
    type: 'tee',
    group: 'Tops',
    name: 'T-shirt',
    alt: 'Short-sleeved T-shirt',
    size: [0.62, 0.56, 0.3],
    limits: { w: [0.45, 0.9], h: [0.35, 0.8], d: [0.22, 0.45] },
    elevation: 0.98,
    color: '#e8dfcf',
    build: (w, h, d) => [
      cyl(0.5, 0.46, h, [0, h / 2, 0], 'main', { scale: [w * 0.68, 1, d] }),
      cyl(0.075, 0.085, 0.2, [-w * 0.41, h - 0.12, 0], 'main', { rot: [0, 0, -0.9] }),
      cyl(0.075, 0.085, 0.2, [w * 0.41, h - 0.12, 0], 'main', { rot: [0, 0, 0.9] }),
      cyl(0.5, 0.5, 0.02, [0, h - 0.008, 0], 'trim', { scale: [w * 0.3, 1, d * 0.5] })
    ]
  },
  {
    type: 'jumper',
    group: 'Tops',
    name: 'Knit jumper',
    alt: 'Long-sleeved ribbed jumper',
    size: [0.7, 0.62, 0.32],
    limits: { w: [0.5, 1.0], h: [0.4, 0.85], d: [0.24, 0.5] },
    elevation: 0.94,
    color: '#8fa58a',
    texture: 'ribbed',
    build: (w, h, d) => [
      cyl(0.5, 0.48, h, [0, h / 2, 0], 'main', { scale: [w * 0.64, 1, d] }),
      cyl(0.07, 0.06, h * 0.86, [-w * 0.4, h * 0.56, 0], 'main', { rot: [0, 0, -0.16] }),
      cyl(0.07, 0.06, h * 0.86, [w * 0.4, h * 0.56, 0], 'main', { rot: [0, 0, 0.16] }),
      cyl(0.5, 0.5, 0.05, [0, h + 0.015, 0], 'trim', { scale: [w * 0.24, 1, d * 0.5] }),
      cyl(0.5, 0.5, 0.05, [0, 0.025, 0], 'trim', { scale: [w * 0.65, 1, d * 1.02] })
    ]
  },
  {
    type: 'jacket',
    group: 'Tops',
    name: 'Jacket',
    alt: 'Boxy jacket with long sleeves and a collar',
    size: [0.76, 0.72, 0.36],
    limits: { w: [0.55, 1.1], h: [0.5, 1.2], d: [0.28, 0.55] },
    elevation: 0.86,
    color: '#2d4263',
    build: (w, h, d) => [
      box([w * 0.31, h, d], [-w * 0.165, h / 2, 0], 'main', { radius: 0.04 }),
      box([w * 0.31, h, d], [w * 0.165, h / 2, 0], 'main', { radius: 0.04 }),
      cyl(0.075, 0.065, h * 0.88, [-w * 0.42, h * 0.55, 0], 'main', { rot: [0, 0, -0.14] }),
      cyl(0.075, 0.065, h * 0.88, [w * 0.42, h * 0.55, 0], 'main', { rot: [0, 0, 0.14] }),
      box([w * 0.5, 0.05, d * 0.7], [0, h + 0.01, -d * 0.1], 'trim', { radius: 0.02 }),
      sphere(0.014, [-0.03, h * 0.6, d / 2 + 0.004], 'metal'),
      sphere(0.014, [-0.03, h * 0.38, d / 2 + 0.004], 'metal')
    ]
  },
  {
    type: 'trousers',
    group: 'Bottoms',
    name: 'Trousers',
    alt: 'Straight-leg trousers with a waistband',
    size: [0.42, 0.98, 0.3],
    limits: { w: [0.34, 0.7], h: [0.4, 1.05], d: [0.22, 0.45] },
    elevation: 0.1,
    color: '#27323a',
    build: (w, h, d) => {
      const seat = Math.min(0.2, h * 0.24)
      return [
        cyl(0.5, 0.46, h - seat, [-w * 0.25, (h - seat) / 2, 0], 'main', { scale: [w * 0.47, 1, d * 0.8] }),
        cyl(0.5, 0.46, h - seat, [w * 0.25, (h - seat) / 2, 0], 'main', { scale: [w * 0.47, 1, d * 0.8] }),
        cyl(0.47, 0.5, seat, [0, h - seat / 2, 0], 'main', { scale: [w, 1, d] }),
        cyl(0.5, 0.5, 0.04, [0, h - 0.02, 0], 'trim', { scale: [w * 0.96, 1, d * 1.02] })
      ]
    }
  },
  {
    type: 'skirt',
    group: 'Bottoms',
    name: 'Skirt',
    alt: 'Flared knee-length skirt',
    size: [0.62, 0.52, 0.5],
    limits: { w: [0.4, 1.1], h: [0.25, 1.0], d: [0.3, 1.0] },
    elevation: 0.56,
    color: '#b5653f',
    build: (w, h, d) => [
      cyl(0.3, 0.5, h, [0, h / 2, 0], 'main', { scale: [w, 1, d] }),
      cyl(0.31, 0.31, 0.04, [0, h - 0.02, 0], 'trim', { scale: [w, 1, d] })
    ]
  },
  {
    type: 'dress',
    group: 'Bottoms',
    name: 'Dress',
    alt: 'Sleeveless dress with a fitted top and flared skirt',
    size: [0.66, 1.0, 0.5],
    limits: { w: [0.45, 1.1], h: [0.7, 1.45], d: [0.3, 1.0] },
    elevation: 0.5,
    color: '#8b4b5c',
    build: (w, h, d) => {
      const skirt = h * 0.56
      return [
        cyl(0.27, 0.5, skirt, [0, skirt / 2, 0], 'main', { scale: [w, 1, d] }),
        cyl(0.31, 0.27, h - skirt, [0, skirt + (h - skirt) / 2, 0], 'main', { scale: [w, 1, d * 0.72] }),
        cyl(0.28, 0.28, 0.03, [0, skirt, 0], 'trim', { scale: [w, 1, d * 0.74] })
      ]
    }
  },
  {
    type: 'shoes',
    group: 'Finishing',
    name: 'Shoes',
    alt: 'Pair of low rounded shoes',
    size: [0.32, 0.1, 0.28],
    limits: { w: [0.24, 0.5], h: [0.06, 0.3], d: [0.2, 0.4] },
    elevation: 0.04,
    color: '#7d3f2c',
    build: (w, h, d) => [
      box([w * 0.36, h, d], [-w * 0.3, h / 2, 0.03], 'main', { radius: 0.035 }),
      box([w * 0.36, h, d], [w * 0.3, h / 2, 0.03], 'main', { radius: 0.035 }),
      box([w * 0.37, 0.018, d + 0.006], [-w * 0.3, 0.009, 0.03], 'trim'),
      box([w * 0.37, 0.018, d + 0.006], [w * 0.3, 0.009, 0.03], 'trim')
    ]
  },
  {
    type: 'hat',
    group: 'Finishing',
    name: 'Hat',
    alt: 'Hat with a round crown and a flat brim',
    size: [0.4, 0.13, 0.4],
    limits: { w: [0.26, 0.7], h: [0.08, 0.3], d: [0.26, 0.7] },
    elevation: 1.75,
    color: '#c99a3b',
    build: (w, h, d) => [
      cyl(0.5, 0.5, 0.014, [0, 0.007, 0], 'main', { scale: [w, 1, d] }),
      cyl(0.27, 0.3, h, [0, h / 2, 0], 'main', { scale: [w, 1, d] }),
      cyl(0.305, 0.305, 0.03, [0, 0.03, 0], 'trim', { scale: [w, 1, d] })
    ]
  },
  {
    type: 'bag',
    group: 'Finishing',
    name: 'Bag',
    alt: 'Structured handbag with a metal clasp and a top handle',
    size: [0.34, 0.36, 0.13],
    limits: { w: [0.18, 0.7], h: [0.24, 0.7], d: [0.06, 0.3] },
    elevation: 0.04,
    spawn: [0.55, 0.25],
    color: '#3f7a6b',
    build: (w, h, d) => {
      const body = h - 0.12
      return [
        box([w, body, d], [0, body / 2, 0], 'main', { radius: 0.025 }),
        box([w * 0.7, 0.012, 0.012], [0, h - 0.006, 0], 'trim'),
        box([0.012, 0.12, 0.012], [-w * 0.35, body + 0.06, 0], 'trim'),
        box([0.012, 0.12, 0.012], [w * 0.35, body + 0.06, 0], 'trim'),
        box([0.04, 0.03, 0.012], [0, body * 0.78, d / 2 + 0.004], 'metal')
      ]
    }
  }
]

/** The stage every scene starts with. Fixed blocks can be painted but not moved. */
const fixedBlocks = {
  interior: [
    {
      type: 'floor',
      name: 'Floor',
      alt: 'Room floor',
      size: [6, 0.1, 5],
      position: [0, -0.1, 0],
      color: '#d9c7a8',
      texture: 'oak',
      build: (w, h, d) => [box([w, h, d], [0, h / 2, 0], 'main', { radius: 0.004 })]
    },
    {
      type: 'wall-back',
      name: 'Back wall',
      alt: 'Wall at the back of the room',
      size: [6.24, 2.7, 0.12],
      position: [-0.06, -0.1, -2.56],
      color: '#e8dfcf',
      build: (w, h, d) => [box([w, h, d], [0, h / 2, 0], 'main', { radius: 0.004 })]
    },
    {
      type: 'wall-left',
      name: 'Left wall',
      alt: 'Wall on the left of the room',
      size: [0.12, 2.7, 5],
      position: [-3.06, -0.1, 0],
      color: '#dfe6ea',
      build: (w, h, d) => [box([w, h, d], [0, h / 2, 0], 'main', { radius: 0.004 })]
    }
  ],
  outfit: [
    {
      type: 'podium',
      name: 'Podium',
      alt: 'Round display podium',
      size: [2.6, 0.04, 2.6],
      position: [0, 0, 0],
      color: '#e8dfcf',
      texture: 'terrazzo',
      build: (w, h, d) => [cyl(0.5, 0.5, h, [0, h / 2, 0], 'main', { scale: [w, 1, d] })]
    },
    {
      type: 'mannequin',
      name: 'Mannequin',
      alt: 'Abstract standing mannequin',
      size: [0.44, 1.75, 0.3],
      position: [0, 0.04, 0],
      color: '#cfc6b8',
      build: () => [
        cyl(0.062, 0.05, 0.86, [-0.09, 0.43, 0]),
        cyl(0.062, 0.05, 0.86, [0.09, 0.43, 0]),
        cyl(0.5, 0.46, 0.2, [0, 0.95, 0], 'main', { scale: [0.33, 1, 0.22] }),
        cyl(0.5, 0.4, 0.45, [0, 1.27, 0], 'main', { scale: [0.38, 1, 0.23] }),
        cyl(0.045, 0.05, 0.09, [0, 1.535, 0]),
        sphere(0.1, [0, 1.65, 0])
      ]
    }
  ]
}

export const MODES = [
  { id: 'interior', label: 'Interior', noun: 'room' },
  { id: 'outfit', label: 'Outfit', noun: 'outfit' }
]

/** Half-extents of the area blocks may be dragged within, per mode. */
export const STAGE_BOUNDS = {
  interior: { minX: -3, maxX: 3, minZ: -2.5, maxZ: 2.5 },
  outfit: { minX: -1.3, maxX: 1.3, minZ: -1.3, maxZ: 1.3 }
}

export const catalog = { interior: interiorBlocks, outfit: outfitBlocks }

const definitions = Object.fromEntries(
  [...interiorBlocks, ...outfitBlocks, ...fixedBlocks.interior, ...fixedBlocks.outfit]
    .map((definition) => [definition.type, definition])
)

export function getDefinition(type) {
  return definitions[type]
}

/** Catalogue entries for a mode, grouped under their headings in catalogue order. */
export function catalogGroups(mode) {
  const groups = new Map()
  for (const definition of catalog[mode]) {
    if (!groups.has(definition.group)) groups.set(definition.group, [])
    groups.get(definition.group).push(definition)
  }
  return [...groups].map(([name, items]) => ({ name, items }))
}

/** Scene state for one catalogue block, at its default size and paint. */
export function createBlock(type, id, overrides = {}) {
  const definition = getDefinition(type)
  const [w, h, d] = definition.size
  return {
    id,
    type,
    x: 0,
    y: definition.elevation ?? 0,
    z: 0,
    rot: 0,
    w,
    h,
    d,
    color: definition.color,
    texture: definition.texture ?? null,
    textureScale: 1,
    finish: 'satin',
    ...overrides
  }
}

function createFixedBlock(definition) {
  const [x, y, z] = definition.position
  return createBlock(definition.type, definition.type, { x, y, z, fixed: true })
}

/** A furnished starting scene, so the first screen shows the product at work. */
export function createDefaultScene(mode) {
  const fixed = fixedBlocks[mode].map(createFixedBlock)
  if (mode === 'interior') {
    return [
      ...fixed,
      createBlock('tall-unit', 'starter-tall', { x: -2.68, z: -2.18 }),
      createBlock('base-cabinet', 'starter-base', { x: -1.78, z: -2.18, w: 1.2 }),
      createBlock('drawer-unit', 'starter-drawers', { x: -0.78, z: -2.18 }),
      createBlock('wall-cabinet', 'starter-wall', { x: -1.48, z: -2.3, w: 1.8 }),
      createBlock('island', 'starter-island', { x: -0.9, z: -0.3 }),
      createBlock('rug', 'starter-rug', { x: 1.6, z: 1.1, rot: 90 }),
      createBlock('sofa', 'starter-sofa', { x: 1.6, z: 1.55, rot: 180 })
    ]
  }
  return [
    ...fixed,
    createBlock('trousers', 'starter-trousers'),
    createBlock('jumper', 'starter-jumper'),
    createBlock('shoes', 'starter-shoes'),
    createBlock('bag', 'starter-bag', { x: 0.55, z: 0.25, rot: -20 })
  ]
}
