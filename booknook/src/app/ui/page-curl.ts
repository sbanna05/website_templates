import { gsap } from 'gsap';

/**
 * A paper page-curl, drawn with plain DOM layers instead of WebGL.
 *
 * The turning page is folded along a straight line. Its moving corner sits
 * at point P; the fold line is the perpendicular bisector between P and the
 * corner's resting place C. The part of the page beyond the fold is clipped
 * away and drawn again, mirrored across the fold, as the back of the paper.
 * That reflection mirrors the print too, which reads as ink showing through.
 *
 * Layers, bottom to top, laid exactly over the real page:
 *   under  the page being revealed (for a backward turn; a forward turn
 *          reveals the real page itself, which already shows the next page)
 *   cast   the shadow the lifted paper throws onto the page beneath
 *   front  the face of the turning page, clipped to the side still lying flat
 *   flap   the folded-over back of the page
 *
 * Coordinates are in page pixels: origin top-left, y pointing down.
 */

export type Corner = 'top' | 'bottom';

interface Point {
  x: number;
  y: number;
}

const EMPTY_POLYGON = 'polygon(0 0, 0 0, 0 0)';

const toPolygon = (points: Point[]): string =>
  points.length < 3
    ? EMPTY_POLYGON
    : `polygon(${points.map(({ x, y }) => `${x.toFixed(2)}px ${y.toFixed(2)}px`).join(', ')})`;

/** Keeps the part of a convex polygon where `side` is zero or positive. */
function clipPolygon(polygon: Point[], side: (point: Point) => number): Point[] {
  const kept: Point[] = [];
  polygon.forEach((a, index) => {
    const b = polygon[(index + 1) % polygon.length];
    const sideA = side(a);
    const sideB = side(b);
    if (sideA >= 0) kept.push(a);
    if (sideA >= 0 !== sideB >= 0) {
      const t = sideA / (sideA - sideB);
      kept.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  });
  return kept;
}

/** Pulls `point` back onto the circle when it lies outside it. */
function clampToCircle(point: Point, centre: Point, radius: number): Point {
  const dx = point.x - centre.x;
  const dy = point.y - centre.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= radius) return point;
  return { x: centre.x + (dx / distance) * radius, y: centre.y + (dy / distance) * radius };
}

function createLayer(className: string): HTMLDivElement {
  const layer = document.createElement('div');
  layer.className = className;
  layer.setAttribute('aria-hidden', 'true');
  return layer;
}

/** A frozen, non-interactive copy of the page, for drawing it while the real one changes. */
function freeze(page: HTMLElement, className: string): HTMLElement {
  const copy = page.cloneNode(true) as HTMLElement;
  copy.classList.add(className);
  copy.removeAttribute('tabindex');
  copy.removeAttribute('aria-label');
  copy.setAttribute('aria-hidden', 'true');
  return copy;
}

export class PageCurl {
  private readonly width: number;
  private readonly height: number;
  private readonly root = createLayer('curl');
  private readonly cast = createLayer('curl-cast');
  private readonly castShade = createLayer('curl-shade curl-shade-cast');
  private readonly flapWrap = createLayer('curl-flap-wrap');
  private readonly flap = createLayer('curl-flap');
  private readonly flapShade = createLayer('curl-shade curl-shade-flap');
  private readonly bendShade = createLayer('curl-shade curl-shade-bend');
  private front: HTMLElement | null = null;
  private cornerY = 0;
  private direction: 1 | -1 = 1;
  private tween: gsap.core.Tween | null = null;

  /** Where the moving corner is right now. */
  point: Point = { x: 0, y: 0 };

  constructor(
    private readonly stage: HTMLElement,
    private readonly page: HTMLElement,
  ) {
    this.width = page.offsetWidth;
    this.height = page.offsetHeight;
  }

  /** The corner's resting place, with the page lying flat. */
  get flat(): Point {
    return { x: this.width, y: this.cornerY };
  }

  /** The corner once the page has been turned all the way over the spine. */
  get over(): Point {
    return { x: -this.width, y: this.cornerY };
  }

  /** How far the page has turned, from 0 (flat) to 1 (over). */
  get progress(): number {
    return Math.min(1, Math.max(0, (this.width - this.point.x) / (2 * this.width)));
  }

  /**
   * Call before the real page changes. A forward turn freezes the current
   * page as the leaf that turns; a backward turn freezes it as the page that
   * the previous one will settle onto.
   */
  begin(direction: 1 | -1, corner: Corner): void {
    this.direction = direction;
    this.cornerY = corner === 'top' ? 0 : this.height;

    this.root.style.width = `${this.width}px`;
    this.root.style.height = `${this.height}px`;
    this.flap.style.width = `${this.width}px`;
    this.flap.style.height = `${this.height}px`;

    if (direction === 1) {
      this.front = freeze(this.page, 'curl-front');
    } else {
      this.root.append(freeze(this.page, 'curl-under'));
    }
    this.cast.append(this.castShade);
    this.root.append(this.cast);
    if (this.front) this.root.append(this.front);
    this.flapWrap.append(this.flap);
    this.root.append(this.flapWrap);
    this.stage.append(this.root);

    this.setPoint(direction === 1 ? this.flat : this.over);
  }

  /** Call once the real page shows its new content. */
  attach(): void {
    if (!this.front) {
      // A backward turn: the page coming back is the one the real page now shows.
      this.front = freeze(this.page, 'curl-front');
      this.root.insertBefore(this.front, this.flapWrap);
    }
    this.front.append(this.bendShade);
    this.flap.append(freeze(this.front, 'curl-ghost'), this.flapShade);
    this.setPoint(this.point);
  }

  /** Moves the corner, keeping the paper within what a real page attached at the spine can do. */
  setPoint(target: Point): void {
    const { width, height } = this;
    const spineNear = { x: 0, y: this.cornerY };
    const spineFar = { x: 0, y: height - this.cornerY };
    let point = { x: Math.min(target.x, width), y: target.y };
    point = clampToCircle(point, spineNear, width);
    point = clampToCircle(point, spineFar, Math.hypot(width, height));
    this.point = point;
    this.render();
  }

  private render(): void {
    if (!this.front) return;
    const { width, height, point } = this;
    const corner = this.flat;
    const dx = point.x - corner.x;
    const dy = point.y - corner.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 0.5) {
      this.front.style.clipPath = '';
      this.cast.style.clipPath = EMPTY_POLYGON;
      this.flapWrap.style.visibility = 'hidden';
      return;
    }

    // Unit normal of the fold, pointing from the corner towards the spine.
    const nx = dx / distance;
    const ny = dy / distance;
    const mid = { x: (corner.x + point.x) / 2, y: (corner.y + point.y) / 2 };
    const side = (p: Point) => (p.x - mid.x) * nx + (p.y - mid.y) * ny;

    const page = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
    ];
    const flat = clipPolygon(page, side);
    const folded = clipPolygon(page, (p) => -side(p));

    this.front.style.clipPath = toPolygon(flat);
    this.cast.style.clipPath = toPolygon(folded);
    this.flap.style.clipPath = toPolygon(folded);
    this.flapWrap.style.visibility = folded.length >= 3 ? 'visible' : 'hidden';

    // Reflection across the fold line: x' = x - 2((x - mid) · n) n.
    const offset = 2 * (mid.x * nx + mid.y * ny);
    this.flap.style.transform = `matrix(${1 - 2 * nx * nx}, ${-2 * nx * ny}, ${-2 * nx * ny}, ${
      1 - 2 * ny * ny
    }, ${offset * nx}, ${offset * ny})`;

    // Shadows grow as the page lifts and fade as it lies down on the other side.
    const lift = Math.sin(this.progress * Math.PI);
    const strength = Math.min(1, distance / (width * 0.25)) * (0.35 + 0.65 * lift);
    const reach = Math.min(distance / 2, width * 0.35);
    this.placeShade(this.castShade, mid, nx, ny, -1, reach, strength);
    this.placeShade(this.flapShade, mid, nx, ny, -1, distance / 2 + 2, 1);
    this.placeShade(this.bendShade, mid, nx, ny, 1, Math.min(48, distance / 3), strength);
  }

  /**
   * Lays a long gradient strip along the fold line. `toward` is +1 for the
   * flat side of the page and -1 for the corner side.
   */
  private placeShade(
    shade: HTMLElement,
    mid: Point,
    nx: number,
    ny: number,
    toward: 1 | -1,
    depth: number,
    opacity: number,
  ): void {
    const length = 3 * Math.hypot(this.width, this.height);
    // Rotate the strip so its top edge lies on the fold and it extends to the chosen side.
    const angle = Math.atan2(-toward * nx, toward * ny);
    shade.style.width = `${length}px`;
    shade.style.height = `${Math.max(1, depth)}px`;
    shade.style.opacity = opacity.toFixed(3);
    shade.style.transform = `translate(${mid.x}px, ${mid.y}px) rotate(${angle}rad) translate(-50%, 0)`;
  }

  /** Plays a whole turn, the corner lifting in a gentle arc as it crosses the page. */
  play(duration: number): Promise<void> {
    const from = this.direction === 1 ? this.flat : this.over;
    const to = this.direction === 1 ? this.over : this.flat;
    const lift = this.height * 0.14 * (this.cornerY === 0 ? 1 : -1);
    const proxy = { t: 0 };
    return this.animate(proxy, {
      t: 1,
      duration,
      ease: 'sine.inOut',
      onUpdate: () =>
        this.setPoint({
          x: from.x + (to.x - from.x) * proxy.t,
          y: from.y + lift * Math.sin(Math.PI * proxy.t),
        }),
    });
  }

  /** Lets go of a dragged page: it either finishes turning or falls back. */
  release(complete: boolean): Promise<void> {
    const forwardTarget = complete ? this.over : this.flat;
    const backwardTarget = complete ? this.flat : this.over;
    const target = this.direction === 1 ? forwardTarget : backwardTarget;
    const remaining = Math.hypot(target.x - this.point.x, target.y - this.point.y);
    const proxy = { ...this.point };
    return this.animate(proxy, {
      x: target.x,
      y: target.y,
      duration: 0.22 + 0.38 * Math.min(1, remaining / (2 * this.width)),
      ease: 'power2.out',
      onUpdate: () => this.setPoint(proxy),
    });
  }

  private animate(proxy: object, vars: gsap.TweenVars): Promise<void> {
    this.tween?.kill();
    return new Promise((resolve) => {
      this.tween = gsap.to(proxy, { ...vars, onComplete: () => resolve() });
    });
  }

  destroy(): void {
    this.tween?.kill();
    this.root.remove();
  }
}
