// Draws the built-in tileable patterns onto a canvas. No image files, so
// nothing to license and nothing to download.
//
// Every pattern is pale and low-contrast: the block's colour multiplies the
// texture, so a light base lets any colour come through cleanly.

const SIZE = 512

/** Small seeded PRNG so each pattern looks identical on every load. */
function createRandom(seed) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

function fill(ctx, color) {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, SIZE, SIZE)
}

/** Draws `draw` at the origin and at every wrapped offset, so edges tile. */
function tiled(ctx, draw) {
  for (const dx of [-SIZE, 0, SIZE]) {
    for (const dy of [-SIZE, 0, SIZE]) {
      ctx.save()
      ctx.translate(dx, dy)
      draw()
      ctx.restore()
    }
  }
}

const painters = {
  oak(ctx) {
    const random = createRandom(11)
    fill(ctx, '#e9dcc6')
    for (let i = 0; i < 150; i += 1) {
      const y = random() * SIZE
      const wobble = 2 + random() * 5
      const phase = random() * Math.PI * 2
      ctx.strokeStyle = `rgba(120, 88, 52, ${0.06 + random() * 0.14})`
      ctx.lineWidth = 0.6 + random() * 1.6
      ctx.beginPath()
      // One full sine period across the width keeps the left and right edges matched.
      for (let x = 0; x <= SIZE; x += 8) {
        const offset = Math.sin((x / SIZE) * Math.PI * 2 + phase) * wobble
        if (x === 0) ctx.moveTo(x, y + offset)
        else ctx.lineTo(x, y + offset)
      }
      ctx.stroke()
    }
  },

  linen(ctx) {
    const random = createRandom(23)
    fill(ctx, '#ece7dc')
    const step = 4
    for (let i = 0; i < SIZE; i += step) {
      ctx.fillStyle = `rgba(90, 80, 64, ${0.04 + random() * 0.1})`
      ctx.fillRect(i, 0, 1.5, SIZE)
      ctx.fillStyle = `rgba(255, 255, 255, ${0.08 + random() * 0.16})`
      ctx.fillRect(0, i, SIZE, 1.5)
    }
  },

  marble(ctx) {
    const random = createRandom(37)
    fill(ctx, '#f1efeb')
    for (let i = 0; i < 9; i += 1) {
      const startX = random() * SIZE
      const startY = random() * SIZE
      const points = []
      let x = startX
      let y = startY
      for (let step = 0; step < 14; step += 1) {
        points.push([x, y])
        x += 26 + random() * 30
        y += (random() - 0.5) * 70
      }
      ctx.strokeStyle = `rgba(96, 102, 110, ${0.1 + random() * 0.16})`
      ctx.lineWidth = 0.8 + random() * 2.2
      ctx.lineJoin = 'round'
      tiled(ctx, () => {
        ctx.beginPath()
        points.forEach(([px, py], index) => (index ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
        ctx.stroke()
      })
    }
  },

  terrazzo(ctx) {
    const random = createRandom(53)
    fill(ctx, '#ece8e1')
    const chips = ['#b9a48e', '#8d9a93', '#cbb9a6', '#6f7478', '#d8cdbf']
    for (let i = 0; i < 190; i += 1) {
      const x = random() * SIZE
      const y = random() * SIZE
      const radius = 3 + random() * 9
      const corners = 4 + Math.floor(random() * 3)
      const angles = Array.from({ length: corners }, () => random() * Math.PI * 2).sort()
      ctx.fillStyle = chips[Math.floor(random() * chips.length)]
      ctx.globalAlpha = 0.55 + random() * 0.4
      tiled(ctx, () => {
        ctx.beginPath()
        angles.forEach((angle, index) => {
          const px = x + Math.cos(angle) * radius
          const py = y + Math.sin(angle) * radius
          if (index) ctx.lineTo(px, py)
          else ctx.moveTo(px, py)
        })
        ctx.closePath()
        ctx.fill()
      })
    }
    ctx.globalAlpha = 1
  },

  ribbed(ctx) {
    fill(ctx, '#ebe6de')
    const ribs = 16
    const width = SIZE / ribs
    for (let i = 0; i < ribs; i += 1) {
      const gradient = ctx.createLinearGradient(i * width, 0, (i + 1) * width, 0)
      gradient.addColorStop(0, 'rgba(60, 54, 46, 0.26)')
      gradient.addColorStop(0.45, 'rgba(255, 255, 255, 0.3)')
      gradient.addColorStop(1, 'rgba(60, 54, 46, 0.26)')
      ctx.fillStyle = gradient
      ctx.fillRect(i * width, 0, width, SIZE)
    }
  },

  herringbone(ctx) {
    const random = createRandom(71)
    fill(ctx, '#e6d9c4')
    const plankLength = SIZE / 4
    const plankWidth = SIZE / 16
    ctx.lineWidth = 1.5
    for (let row = -2; row < 18; row += 1) {
      for (let col = -1; col < 5; col += 1) {
        const leaning = col % 2 === 0
        ctx.save()
        ctx.translate(col * plankLength + plankLength / 2, row * plankWidth * 2)
        ctx.transform(1, leaning ? 0.5 : -0.5, 0, 1, 0, 0)
        ctx.fillStyle = `rgba(150, 112, 70, ${0.08 + random() * 0.16})`
        ctx.strokeStyle = 'rgba(92, 66, 40, 0.3)'
        ctx.fillRect(-plankLength / 2, 0, plankLength, plankWidth * 2)
        ctx.strokeRect(-plankLength / 2, 0, plankLength, plankWidth * 2)
        ctx.restore()
      }
    }
  }
}

/** Returns a canvas with the named pattern drawn on it. */
export function drawProceduralTexture(id) {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  painters[id](canvas.getContext('2d'))
  return canvas
}

const thumbnailCache = new Map()

/** A small data-URL preview of the pattern, for picker swatches. */
export function proceduralThumbnail(id) {
  if (!thumbnailCache.has(id)) {
    const thumb = document.createElement('canvas')
    thumb.width = 160
    thumb.height = 160
    thumb.getContext('2d').drawImage(drawProceduralTexture(id), 0, 0, 220, 220)
    thumbnailCache.set(id, thumb.toDataURL('image/webp', 0.85))
  }
  return thumbnailCache.get(id)
}
