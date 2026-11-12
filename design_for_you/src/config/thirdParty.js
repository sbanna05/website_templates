// Audit record of every third-party package in the project. Shown in the
// Privacy & data dialog and verified by `npm run check`, which fails if
// package.json and this list disagree.
//
// `runtime: true`  - code or files shipped to the browser, bundled locally.
// `runtime: false` - used only on the developer's machine to build the app.
// None of them makes a network request, sets a cookie or collects data.

export const AUDIT_DATE = '2026-11-12'

export const thirdParty = [
  {
    package: 'vue',
    name: 'Vue',
    purpose: 'Draws the interface',
    license: 'MIT',
    runtime: true
  },
  {
    package: 'three',
    name: 'three.js',
    purpose: 'Renders the 3D scene',
    license: 'MIT',
    runtime: true
  },
  {
    package: '@fontsource-variable/manrope',
    name: 'Manrope',
    purpose: 'Interface typeface, served from this site',
    license: 'OFL-1.1',
    runtime: true
  },
  {
    package: '@fontsource-variable/fraunces',
    name: 'Fraunces',
    purpose: 'Headline typeface, served from this site',
    license: 'OFL-1.1',
    runtime: true
  },
  {
    package: 'vite',
    name: 'Vite',
    purpose: 'Builds the site',
    license: 'MIT',
    runtime: false
  },
  {
    package: '@vitejs/plugin-vue',
    name: 'Vite Vue plugin',
    purpose: 'Builds the site',
    license: 'MIT',
    runtime: false
  },
  {
    package: 'sharp',
    name: 'sharp',
    purpose: 'Shrinks texture images before they ship',
    license: 'Apache-2.0',
    runtime: false
  }
]
