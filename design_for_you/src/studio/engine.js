// The 3D view. Owns the renderer, camera, lights and one group per block,
// and reports pointer interaction back through callbacks. It never changes
// scene state itself: the store (useStudio.js) is the source of truth and
// calls `sync()` whenever blocks change.
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import {
  addStudioLights,
  buildMeshes,
  createMaterials,
  disposeMaterials,
  disposeMeshes,
  paintMaterials
} from './blockMesh'
import { clampToStage, snapToGrid } from './stage'
import { cloneForBlock, loadTexture } from './textureStore'

const MAX_PIXEL_RATIO = 2
const MAX_EXPORT_WIDTH = 4096
const DRAG_THRESHOLD_PX = 4
const DRAG_LIFT = 0.07
const ACCENT = '#a9c7ae'
const EXPORT_BACKGROUND = '#1b2025'

const VIEWS = {
  interior: { position: [6.4, 4.7, 8.4], target: [0, 0.7, 0], groundY: -0.1 },
  outfit: { position: [2.3, 1.7, 4.3], target: [0, 0.92, 0], groundY: 0 }
}
const MIN_DISTANCE = 1.1
const MAX_DISTANCE = 18

const easeOutBack = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2
const easeInOut = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
/** Frame-rate independent smoothing factor for "move a fraction of the way each frame". */
const damp = (rate, dt) => 1 - Math.exp(-rate * dt)

const geometrySignature = (b) => `${b.type}|${b.w}|${b.h}|${b.d}`
const paintSignature = (b) => `${b.color}|${b.texture}|${b.textureScale}|${b.finish}`

export class StudioEngine {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} callbacks
   * @param {(id: string | null) => void} callbacks.onSelect
   * @param {(id: string, x: number, z: number) => void} callbacks.onDragMove
   * @param {(id: string) => void} callbacks.onDragEnd
   * @param {(zoomPercent: number) => void} callbacks.onZoom
   */
  constructor(canvas, callbacks) {
    this.canvas = canvas
    this.callbacks = callbacks
    this.mode = 'interior'
    this.snap = true
    this.entries = new Map()
    this.leaving = []
    this.selectedId = null
    this.drag = null
    this.cameraTween = null
    this.needsRender = true
    this.lastZoom = null
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.NeutralToneMapping
    this.renderer.toneMappingExposure = 1
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap

    this.scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    this.scene.environmentIntensity = 0.42
    pmrem.dispose()

    const { key } = addStudioLights(this.scene)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.bias = -0.0003
    key.shadow.normalBias = 0.03
    key.shadow.radius = 5
    Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 30 })
    key.shadow.camera.updateProjectionMatrix()

    // Catches shadows that fall beyond the floor or podium.
    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.ShadowMaterial({ opacity: 0.28 })
    )
    this.ground.rotation.x = -Math.PI / 2
    this.ground.receiveShadow = true
    this.scene.add(this.ground)

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()
    this.dragPlane = new THREE.Plane()

    // Registered before OrbitControls (and in the capture phase) so a press
    // on a block can switch orbiting off before the controls see the event.
    canvas.addEventListener('pointerdown', this.onPointerDown, { capture: true })
    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('pointerup', this.onPointerUp)
    canvas.addEventListener('pointercancel', this.onPointerUp)

    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.09
    this.controls.minDistance = MIN_DISTANCE
    this.controls.maxDistance = MAX_DISTANCE
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03
    this.controls.zoomToCursor = true
    this.controls.addEventListener('change', () => { this.needsRender = true })

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(canvas.parentElement)
    this.resize()
    this.setMode('interior', { animate: false })

    this.timer = new THREE.Timer()
    this.renderer.setAnimationLoop(() => this.tick())
  }

  // ---- Scene sync -------------------------------------------------------

  /** Makes the 3D scene match `blocks`. Cheap to call on every state change. */
  sync(blocks, selectedId) {
    this.selectedId = selectedId
    const seen = new Set()

    for (const block of blocks) {
      seen.add(block.id)
      let entry = this.entries.get(block.id)
      if (!entry) entry = this.createEntry(block)
      entry.block = block

      if (entry.geometrySignature !== geometrySignature(block)) this.rebuildGeometry(entry)
      if (entry.paintSignature !== paintSignature(block)) this.repaint(entry)

      entry.outline.visible = block.id === selectedId
      if (this.drag?.entry !== entry) entry.liftTarget = 0
    }

    for (const [id, entry] of this.entries) {
      if (seen.has(id)) continue
      this.entries.delete(id)
      if (this.drag?.entry === entry) this.drag = null
      entry.outline.visible = false
      this.leaving.push(entry)
    }
    this.needsRender = true
  }

  createEntry(block) {
    const group = new THREE.Group()
    group.userData.blockId = block.id
    group.position.set(block.x, block.y, block.z)
    group.rotation.y = THREE.MathUtils.degToRad(block.rot)

    // `body` carries the pop-in scale and drag lift so they never disturb
    // the block's real position on `group`.
    const body = new THREE.Group()
    group.add(body)

    const outline = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: ACCENT, depthTest: false, transparent: true })
    )
    outline.renderOrder = 10
    outline.visible = false
    body.add(outline)

    const entry = {
      block,
      group,
      body,
      outline,
      meshes: [],
      materials: createMaterials(),
      map: null,
      geometrySignature: '',
      paintSignature: '',
      // Fixed stage pieces are part of the room, so they appear without a pop.
      pop: block.fixed || this.reducedMotion.matches ? 1 : 0,
      lift: 0,
      liftTarget: 0
    }
    this.entries.set(block.id, entry)
    this.scene.add(group)
    return entry
  }

  rebuildGeometry(entry) {
    const { block } = entry
    disposeMeshes(entry.meshes)
    entry.meshes = buildMeshes(block, entry.materials)
    entry.body.add(...entry.meshes)

    const pad = 0.03
    entry.outline.geometry.dispose()
    entry.outline.geometry = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(block.w + pad, block.h + pad, block.d + pad)
    )
    entry.outline.position.y = block.h / 2
    entry.geometrySignature = geometrySignature(block)
  }

  repaint(entry) {
    const { block } = entry
    const signature = paintSignature(block)
    entry.paintSignature = signature

    const applyMap = (map) => {
      entry.map?.dispose()
      entry.map = map
      paintMaterials(entry.materials, block, map)
      this.needsRender = true
    }

    if (!block.texture) {
      applyMap(null)
      return
    }

    // Colour and finish show immediately; the map follows once it has loaded.
    paintMaterials(entry.materials, block, entry.map)
    loadTexture(block.texture)
      .then((base) => {
        // Skip if the block was repainted or removed while the image loaded.
        if (entry.paintSignature !== signature || !this.entries.has(block.id)) return
        applyMap(cloneForBlock(base, block.texture, block.textureScale))
      })
      .catch(() => {
        if (entry.paintSignature === signature) applyMap(null)
      })
  }

  disposeEntry(entry) {
    this.scene.remove(entry.group)
    disposeMeshes(entry.meshes)
    disposeMaterials(entry.materials)
    entry.map?.dispose()
    entry.outline.geometry.dispose()
    entry.outline.material.dispose()
  }

  // ---- Frame loop -------------------------------------------------------

  tick() {
    this.timer.update()
    const dt = Math.min(this.timer.getDelta(), 0.05)
    const instant = this.reducedMotion.matches
    let animating = false

    for (const entry of this.entries.values()) {
      const { block, group, body } = entry
      if (this.drag?.entry !== entry || !this.drag.moved) {
        const targetRotation = THREE.MathUtils.degToRad(block.rot)
        // Shortest way round, so 350° to 10° turns 20°, not 340°.
        const turn = THREE.MathUtils.euclideanModulo(targetRotation - group.rotation.y + Math.PI, Math.PI * 2) - Math.PI
        const offset = Math.abs(group.position.x - block.x) + Math.abs(group.position.y - block.y) +
          Math.abs(group.position.z - block.z) + Math.abs(turn)
        if (offset > 0.0005 && !instant) {
          const k = damp(16, dt)
          group.position.x += (block.x - group.position.x) * k
          group.position.y += (block.y - group.position.y) * k
          group.position.z += (block.z - group.position.z) * k
          group.rotation.y += turn * k
          animating = true
        } else if (offset > 0) {
          group.position.set(block.x, block.y, block.z)
          group.rotation.y = targetRotation
          this.needsRender = true
        }
      }

      if (Math.abs(entry.lift - entry.liftTarget) > 0.0005) {
        entry.lift = instant ? entry.liftTarget : entry.lift + (entry.liftTarget - entry.lift) * damp(18, dt)
        body.position.y = entry.lift
        animating = true
      }

      if (entry.pop < 1) {
        entry.pop = Math.min(1, entry.pop + dt / 0.42)
        body.scale.setScalar(Math.max(0.001, easeOutBack(entry.pop)))
        animating = true
      }
    }

    for (let i = this.leaving.length - 1; i >= 0; i -= 1) {
      const entry = this.leaving[i]
      entry.pop -= instant ? 1 : dt / 0.16
      if (entry.pop <= 0) {
        this.disposeEntry(entry)
        this.leaving.splice(i, 1)
      } else {
        entry.body.scale.setScalar(entry.pop)
      }
      animating = true
    }

    if (this.cameraTween) {
      this.stepCameraTween(dt)
      animating = true
    }
    this.controls.update()

    if (animating || this.needsRender) {
      this.renderer.render(this.scene, this.camera)
      this.needsRender = false
      this.reportZoom()
    }
  }

  resize() {
    const { clientWidth: width, clientHeight: height } = this.canvas.parentElement
    if (!width || !height) return
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.needsRender = true
  }

  // ---- Camera -----------------------------------------------------------

  setMode(mode, { animate = true } = {}) {
    this.mode = mode
    this.ground.position.y = VIEWS[mode].groundY - 0.002
    this.baseDistance = new THREE.Vector3(...VIEWS[mode].position)
      .distanceTo(new THREE.Vector3(...VIEWS[mode].target))
    this.resetView({ animate })
  }

  resetView({ animate = true } = {}) {
    const view = VIEWS[this.mode]
    this.moveCamera(new THREE.Vector3(...view.position), new THREE.Vector3(...view.target), animate)
  }

  /** Looks straight down at the stage, like a floor plan. */
  topView() {
    const target = new THREE.Vector3(...VIEWS[this.mode].target).setY(0)
    // A hair off vertical so OrbitControls keeps a stable "up".
    const position = target.clone().add(new THREE.Vector3(0, this.baseDistance * 1.25, 0.01))
    this.moveCamera(position, target, true)
  }

  moveCamera(position, target, animate) {
    if (!animate || this.reducedMotion.matches) {
      this.camera.position.copy(position)
      this.controls.target.copy(target)
      this.cameraTween = null
      this.needsRender = true
      return
    }
    this.cameraTween = {
      fromPosition: this.camera.position.clone(),
      fromTarget: this.controls.target.clone(),
      toPosition: position,
      toTarget: target,
      progress: 0
    }
  }

  stepCameraTween(dt) {
    const tween = this.cameraTween
    tween.progress = Math.min(1, tween.progress + dt / 0.5)
    const t = easeInOut(tween.progress)
    this.camera.position.lerpVectors(tween.fromPosition, tween.toPosition, t)
    this.controls.target.lerpVectors(tween.fromTarget, tween.toTarget, t)
    if (tween.progress === 1) this.cameraTween = null
  }

  /** Zooms by `factor` (above 1 moves closer), keeping the same viewing angle. */
  zoomBy(factor) {
    const offset = this.camera.position.clone().sub(this.controls.target)
    const distance = THREE.MathUtils.clamp(offset.length() / factor, MIN_DISTANCE, MAX_DISTANCE)
    const position = this.controls.target.clone().add(offset.setLength(distance))
    this.moveCamera(position, this.controls.target.clone(), true)
  }

  /** Orbits around the target by the given angles in radians. Used by the keyboard. */
  orbitBy(azimuth, polar) {
    const offset = this.camera.position.clone().sub(this.controls.target)
    const spherical = new THREE.Spherical().setFromVector3(offset)
    spherical.theta += azimuth
    spherical.phi = THREE.MathUtils.clamp(spherical.phi + polar, 0.05, this.controls.maxPolarAngle)
    this.camera.position.copy(this.controls.target).add(offset.setFromSpherical(spherical))
    this.cameraTween = null
    this.needsRender = true
  }

  reportZoom() {
    const distance = this.camera.position.distanceTo(this.controls.target)
    const zoom = Math.round((this.baseDistance / distance) * 100)
    if (zoom !== this.lastZoom) {
      this.lastZoom = zoom
      this.callbacks.onZoom(zoom)
    }
  }

  // ---- Picking and dragging -----------------------------------------------

  setPointer(event) {
    const rect = this.canvas.getBoundingClientRect()
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    )
    this.raycaster.setFromCamera(this.pointer, this.camera)
  }

  /**
   * What is under a screen point: the block there (if any), and where the
   * ray meets the floor. Used for pointer picking and for HTML drag-and-drop.
   */
  pick(event) {
    this.setPointer(event)
    const groups = [...this.entries.values()].map((entry) => entry.group)
    const hit = this.raycaster.intersectObjects(groups, true).find((h) => h.object.isMesh)

    let id = null
    for (let node = hit?.object; node && !id; node = node.parent) id = node.userData.blockId ?? null

    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -VIEWS[this.mode].groundY)
    const floor = this.raycaster.ray.intersectPlane(floorPlane, new THREE.Vector3())
    return { id, point: hit?.point ?? null, floor }
  }

  onPointerDown = (event) => {
    if (event.button !== 0) return
    const { id, point } = this.pick(event)
    this.press = { x: event.clientX, y: event.clientY, id }
    if (!id) return

    this.callbacks.onSelect(id)
    const entry = this.entries.get(id)
    if (!entry || entry.block.fixed) return

    // Dragging slides the block on a horizontal plane through the grabbed point.
    this.dragPlane.set(new THREE.Vector3(0, 1, 0), -point.y)
    this.drag = {
      entry,
      moved: false,
      grab: point.clone(),
      start: { x: entry.block.x, z: entry.block.z }
    }
    this.controls.enabled = false
    this.canvas.setPointerCapture(event.pointerId)
  }

  onPointerMove = (event) => {
    if (!this.drag) {
      if (event.buttons === 0) {
        const { id } = this.pick(event)
        const fixed = id ? this.entries.get(id)?.block.fixed : true
        this.canvas.style.cursor = id ? (fixed ? 'pointer' : 'grab') : ''
      }
      return
    }

    const { drag } = this
    if (!drag.moved) {
      const travelled = Math.hypot(event.clientX - this.press.x, event.clientY - this.press.y)
      if (travelled < DRAG_THRESHOLD_PX) return
      drag.moved = true
      drag.entry.liftTarget = DRAG_LIFT
      this.canvas.style.cursor = 'grabbing'
    }

    this.setPointer(event)
    const hit = this.raycaster.ray.intersectPlane(this.dragPlane, new THREE.Vector3())
    if (!hit) return

    const { block, group } = drag.entry
    let x = drag.start.x + hit.x - drag.grab.x
    let z = drag.start.z + hit.z - drag.grab.z
    if (this.snap && !event.shiftKey) {
      x = snapToGrid(x)
      z = snapToGrid(z)
    }
    const clamped = clampToStage(block, x, z, this.mode)
    group.position.x = clamped.x
    group.position.z = clamped.z
    this.needsRender = true
    this.callbacks.onDragMove(block.id, clamped.x, clamped.z)
  }

  onPointerUp = (event) => {
    const { drag, press } = this
    this.drag = null
    this.press = null
    this.controls.enabled = true

    if (drag) {
      if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId)
      drag.entry.liftTarget = 0
      this.canvas.style.cursor = 'grab'
      if (drag.moved) this.callbacks.onDragEnd(drag.entry.block.id)
      return
    }

    // A click on empty space (not the end of an orbit drag) clears the selection.
    if (press && !press.id) {
      const travelled = Math.hypot(event.clientX - press.x, event.clientY - press.y)
      if (travelled < DRAG_THRESHOLD_PX) this.callbacks.onSelect(null)
    }
  }

  // ---- Export -----------------------------------------------------------

  /** Renders the scene at up to twice the screen resolution and resolves with a PNG blob. */
  snapshot() {
    const pixelRatio = this.renderer.getPixelRatio()
    const exportRatio = Math.min(pixelRatio * 2, MAX_EXPORT_WIDTH / this.canvas.clientWidth)
    const selected = this.entries.get(this.selectedId)

    if (selected) selected.outline.visible = false
    this.scene.background = new THREE.Color(EXPORT_BACKGROUND)
    this.renderer.setPixelRatio(Math.max(pixelRatio, exportRatio))
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false)
    this.renderer.render(this.scene, this.camera)

    const blob = new Promise((resolve, reject) => {
      this.canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('Export failed'))), 'image/png')
    })

    this.scene.background = null
    if (selected) selected.outline.visible = true
    this.renderer.setPixelRatio(pixelRatio)
    this.resize()
    return blob
  }

  dispose() {
    this.renderer.setAnimationLoop(null)
    this.resizeObserver.disconnect()
    this.canvas.removeEventListener('pointerdown', this.onPointerDown, { capture: true })
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.canvas.removeEventListener('pointerup', this.onPointerUp)
    this.canvas.removeEventListener('pointercancel', this.onPointerUp)
    this.controls.dispose()
    for (const entry of [...this.entries.values(), ...this.leaving]) this.disposeEntry(entry)
    this.entries.clear()
    this.scene.environment?.dispose()
    this.renderer.dispose()
  }
}
