// Converts the full-size texture sources into the small files the app ships:
//   texture-sources/<file>  ->  public/textures/<id>.webp        (1024 px, tiles in 3D)
//                               public/textures/<id>.thumb.webp  (192 px, picker swatch)
//
// Run with `npm run textures` after adding a source file and its entry in
// src/config/textures.js.
import { mkdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { photoTextures } from '../src/config/textures.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = path.join(root, 'texture-sources')
const outDir = path.join(root, 'public', 'textures')

const TILE_SIZE = 1024
const THUMB_SIZE = 192

await mkdir(outDir, { recursive: true })

for (const texture of photoTextures) {
  const input = path.join(sourceDir, texture.sourceFile)
  const tile = path.join(outDir, `${texture.id}.webp`)
  const thumb = path.join(outDir, `${texture.id}.thumb.webp`)

  await sharp(input).resize(TILE_SIZE, TILE_SIZE, { fit: 'cover' }).webp({ quality: 82 }).toFile(tile)
  await sharp(input).resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover' }).webp({ quality: 76 }).toFile(thumb)

  const [before, after] = await Promise.all([stat(input), stat(tile)])
  const kb = (bytes) => `${Math.round(bytes / 1024)} kB`
  console.log(`${texture.id}: ${kb(before.size)} -> ${kb(after.size)}`)
}
