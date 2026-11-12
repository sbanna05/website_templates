// Release checks for the promises the app makes to its users:
//   1. Every shipped image has a licence record, an approved licence and alt text.
//   2. Every installed package is in the third-party audit list (and vice versa).
//   3. Source code makes no requests to outside services.
//
// Run with `npm run check`. Exits with code 1 if anything fails.
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { APPROVED_LICENSES, photoTextures, textures } from '../src/config/textures.js'
import { thirdParty } from '../src/config/thirdParty.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const problems = []
const fail = (message) => problems.push(message)

// ---- 1. Image licences and alt text ----------------------------------------

for (const texture of textures) {
  if (!APPROVED_LICENSES.includes(texture.license)) fail(`Texture "${texture.id}" has an unapproved licence: ${texture.license}`)
  if (!texture.alt?.trim()) fail(`Texture "${texture.id}" has no alt text`)
  if (!texture.reviewed) fail(`Texture "${texture.id}" has no licence review date`)
  if (texture.kind === 'photo' && !texture.sourceUrl) fail(`Texture "${texture.id}" has no source URL`)
}

const expectedFiles = new Set(photoTextures.flatMap((texture) => [`${texture.id}.webp`, `${texture.id}.thumb.webp`]))
const shippedFiles = await readdir(path.join(root, 'public', 'textures'))
for (const file of shippedFiles) {
  if (!expectedFiles.has(file)) fail(`public/textures/${file} has no licence record in src/config/textures.js`)
}
for (const file of expectedFiles) {
  if (!shippedFiles.includes(file)) fail(`public/textures/${file} is missing. Run "npm run textures".`)
}

// ---- 2. Third-party packages ---------------------------------------------------

const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const installed = { ...manifest.dependencies, ...manifest.devDependencies }
const audited = new Map(thirdParty.map((library) => [library.package, library]))

for (const name of Object.keys(installed)) {
  if (!audited.has(name)) fail(`Package "${name}" is installed but missing from src/config/thirdParty.js`)
}
for (const [name, library] of audited) {
  if (!(name in installed)) fail(`Package "${name}" is audited but no longer installed`)
  else if (library.runtime !== name in (manifest.dependencies ?? {})) {
    fail(`Package "${name}" is listed under the wrong heading (runtime vs build tool)`)
  }
}

// ---- 3. No outside requests ------------------------------------------------------

// URLs that are shown to the user as links or are XML namespaces, never fetched.
const ALLOWED_URL = /^https?:\/\/(polyhaven\.com\/a\/|www\.w3\.org\/)/
const NETWORK_CALL = /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(/

async function sourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? sourceFiles(full) : [full]
  }))
  return nested.flat()
}

const files = [...await sourceFiles(path.join(root, 'src')), path.join(root, 'index.html')]
for (const file of files) {
  if (!/\.(js|vue|css|html)$/.test(file)) continue
  const relative = path.relative(root, file)
  const lines = (await readFile(file, 'utf8')).split('\n')
  lines.forEach((line, index) => {
    for (const url of line.match(/https?:\/\/[^\s'"`)<]+/g) ?? []) {
      if (!ALLOWED_URL.test(url)) fail(`${relative}:${index + 1} references an outside URL: ${url}`)
    }
    if (NETWORK_CALL.test(line)) fail(`${relative}:${index + 1} makes a network call`)
  })
}

// ---- Report --------------------------------------------------------------------

if (problems.length) {
  console.error(`${problems.length} problem${problems.length === 1 ? '' : 's'} found:\n`)
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}
console.log(`All checks passed: ${textures.length} materials licensed with alt text, ${audited.size} packages audited, no outside requests in ${files.length} source files.`)
