import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BookText, ParsedBook } from '../core/book-text';
import { BrowserStorage } from '../core/browser-storage';
import { Library } from '../core/library';
import { Notifier } from '../core/notifier';
import { Icon } from '../ui/icon';
import { Corner, PageCurl } from '../ui/page-curl';
import { Tooltip } from '../ui/tooltip';

type Status = 'loading' | 'ready' | 'missing' | 'failed';

const FONTS = [
  { id: 'newsreader', name: 'Newsreader', family: "'Newsreader Variable', Georgia, serif" },
  { id: 'literata', name: 'Literata', family: "'Literata Variable', Georgia, serif" },
  { id: 'figtree', name: 'Figtree', family: "'Figtree Variable', system-ui, sans-serif" },
] as const;
type FontId = (typeof FONTS)[number]['id'];

const SIZES = [16, 18, 20, 22, 25];
const DEFAULT_SETTINGS = { font: 'newsreader' as FontId, size: 1 };
const TURN_SECONDS = 0.9;
const TURN_SECONDS_NARROW = 0.72;
/** How far a pointer must travel before a press becomes a drag. */
const DRAG_START_PX = 8;
/** The corner moves faster than the finger, so a turn never needs a full-width drag. */
const DRAG_GAIN = 1.5;
/** Pixels per millisecond: a flick this fast finishes the turn however short it was. */
const FLICK_SPEED = 0.45;

interface Drag {
  pointerId: number;
  start: { x: number; y: number };
  latest: { x: number; y: number };
  lastTime: number;
  /** Horizontal speed in pixels per millisecond; negative is leftwards. */
  velocity: number;
  state: 'pressed' | 'ignored' | 'starting' | 'dragging';
  direction: 1 | -1;
  released: boolean;
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/**
 * The reading view. See src/styles/reader.css for how pages are laid out.
 * The book is split into sections; one section is in the page at a time, and
 * the position is saved as section plus how far through it the reader is.
 */
@Component({
  selector: 'app-reader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Tooltip],
  host: { '(document:keydown)': 'onKeydown($event)' },
  template: `
    <div class="reader" [style.--reader-font]="fontFamily()" [style.--reader-size.px]="fontSize()">
      <header class="reader-bar">
        <a
          class="icon-btn"
          [routerLink]="['/book', id()]"
          aria-label="Close the book"
          appTooltip="Close the book"
        >
          <app-icon name="arrow-left" />
        </a>
        <h1 class="mx-2 min-w-0 flex-1 truncate font-sans text-base font-bold tracking-normal">
          {{ title() }}
        </h1>
        <button
          #settingsButton
          type="button"
          class="icon-btn"
          aria-label="Text settings"
          appTooltip="Text settings"
          aria-controls="reader-settings"
          [attr.aria-expanded]="settingsOpen()"
          (click)="settingsOpen.set(!settingsOpen())"
        >
          <app-icon name="type" />
        </button>

        @if (settingsOpen()) {
          <div id="reader-settings" class="reader-settings">
            <fieldset class="m-0 border-0 p-0">
              <legend class="field-label">Typeface</legend>
              <div class="grid gap-1">
                @for (font of fonts; track font.id) {
                  <label class="font-option" [style.font-family]="font.family">
                    <input
                      type="radio"
                      name="reader-font"
                      [checked]="settings().font === font.id"
                      (change)="setFont(font.id)"
                    />
                    {{ font.name }}
                  </label>
                }
              </div>
            </fieldset>

            <p class="field-label mt-4" id="size-label">Text size</p>
            <div class="flex items-center gap-2" role="group" aria-labelledby="size-label">
              <button
                type="button"
                class="btn flex-1"
                aria-label="Make text smaller"
                [attr.aria-disabled]="settings().size === 0"
                (click)="changeSize(-1)"
              >
                <span class="text-sm">A</span>
              </button>
              <output class="num w-14 text-center text-sm font-semibold"
                >{{ fontSize() }} px</output
              >
              <button
                type="button"
                class="btn flex-1"
                aria-label="Make text larger"
                [attr.aria-disabled]="settings().size === sizes.length - 1"
                (click)="changeSize(1)"
              >
                <span class="text-xl">A</span>
              </button>
            </div>
          </div>
        }
      </header>

      <div
        #stage
        class="reader-stage"
        [class.is-dragging]="dragging()"
        (pointerdown)="onPointerDown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="onPointerUp($event)"
        (pointercancel)="onPointerUp($event)"
      >
        @switch (status()) {
          @case ('loading') {
            <div class="reader-page" role="status">
              <span class="visually-hidden">Opening the book</span>
              <div class="grid gap-4">
                <div class="skeleton h-7 w-3/5"></div>
                @for (line of skeletonLines; track $index) {
                  <div class="skeleton h-4" [style.width.%]="line"></div>
                }
              </div>
            </div>
          }
          @case ('missing') {
            <div class="reader-page">
              <h2 class="text-3xl">Booknook does not have this book’s text</h2>
              <p class="mt-3 text-ink-soft">
                Only the bundled classics and the EPUB, PDF and TXT files you add can be read here.
              </p>
              <a class="btn btn-primary mt-6" routerLink="/shelves">Add a book file</a>
            </div>
          }
          @case ('failed') {
            <div class="reader-page" role="alert">
              <h2 class="text-3xl">The book could not be opened</h2>
              <p class="mt-3 text-ink-soft">Check your connection, then open it again.</p>
              <button type="button" class="btn btn-primary mt-6" (click)="load(id())">
                Open the book again
              </button>
            </div>
          }
          @case ('ready') {
            <div
              #page
              class="reader-page"
              tabindex="0"
              [class.can-turn]="!atEnd()"
              [attr.aria-label]="pageLabel()"
            >
              <div #flow class="reader-flow" [style.transform]="flowTransform()">
                @for (block of section()?.blocks; track $index) {
                  @if (block.kind === 'heading') {
                    <h2>{{ block.text }}</h2>
                  } @else {
                    <p>{{ block.text }}</p>
                  }
                }
              </div>
            </div>
          }
        }
      </div>

      <footer class="reader-bar">
        <button
          type="button"
          class="icon-btn"
          aria-label="Previous page"
          appTooltip="Previous page"
          tooltipKey="←"
          [attr.aria-disabled]="atStart()"
          (click)="turn(-1)"
        >
          <app-icon name="chevron-left" />
        </button>

        <div class="mx-2 flex-1">
          <div
            class="reader-progress"
            role="progressbar"
            aria-label="Reading progress"
            aria-valuemin="0"
            aria-valuemax="100"
            [attr.aria-valuenow]="percent()"
          >
            <div [style.width.%]="percent()"></div>
          </div>
          <p class="num mt-1 text-center text-sm text-ink-soft" aria-live="polite">
            {{ percent() }}% read
          </p>
        </div>

        @if (atEnd() && status() === 'ready') {
          <button type="button" class="btn btn-primary" (click)="finish()">Finish book</button>
        } @else {
          <button
            type="button"
            class="icon-btn"
            aria-label="Next page"
            appTooltip="Next page"
            tooltipKey="→"
            (click)="turn(1)"
          >
            <app-icon name="chevron-right" />
          </button>
        }
      </footer>
    </div>
  `,
  styles: `
    .font-option {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 44px;
      padding: 0 12px;
      border-radius: var(--radius-control);
      font-size: 1.0625rem;
      cursor: pointer;
    }

    .font-option:has(:checked) {
      background: var(--accent-wash);
    }

    .font-option input {
      width: 18px;
      height: 18px;
      accent-color: var(--accent);
    }

    [aria-disabled='true'] {
      opacity: 0.4;
    }
  `,
})
export class Reader {
  /** Bound from the `:id` route parameter. */
  readonly id = input.required<string>();

  private readonly library = inject(Library);
  private readonly bookText = inject(BookText);
  private readonly storage = inject(BrowserStorage);
  private readonly notifier = inject(Notifier);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly page = viewChild<ElementRef<HTMLElement>>('page');
  private readonly flow = viewChild<ElementRef<HTMLElement>>('flow');
  private readonly settingsButton = viewChild.required<ElementRef<HTMLElement>>('settingsButton');

  protected readonly fonts = FONTS;
  protected readonly sizes = SIZES;
  protected readonly skeletonLines = [100, 96, 100, 92, 98, 100, 60];

  protected readonly status = signal<Status>('loading');
  private readonly parsed = signal<ParsedBook | null>(null);
  private readonly sectionIndex = signal(0);
  private readonly pageIndex = signal(0);
  private readonly pageCount = signal(1);
  /** Distance between the left edges of two consecutive pages, in pixels. */
  private readonly pageStride = signal(0);
  protected readonly settingsOpen = signal(false);
  protected readonly settings = signal(DEFAULT_SETTINGS);

  private turning = false;
  private queuedTurn: 1 | -1 | null = null;
  private curl: PageCurl | null = null;
  private drag: Drag | null = null;
  protected readonly dragging = signal(false);
  /** Where the next layout pass should land (0 to 1), when a caller asked for a specific place. */
  private requestedRatio: number | null = null;

  protected readonly title = computed(() => this.library.book(this.id())?.title ?? 'Booknook');
  protected readonly section = computed(() => this.parsed()?.sections[this.sectionIndex()] ?? null);
  protected readonly fontFamily = computed(
    () => FONTS.find((font) => font.id === this.settings().font)?.family ?? FONTS[0].family,
  );
  protected readonly fontSize = computed(() => SIZES[this.settings().size] ?? SIZES[1]);
  protected readonly flowTransform = computed(
    () => `translateX(${-this.pageIndex() * this.pageStride()}px)`,
  );

  protected readonly atStart = computed(() => this.sectionIndex() === 0 && this.pageIndex() === 0);
  protected readonly atEnd = computed(() => {
    const sections = this.parsed()?.sections.length ?? 0;
    return this.sectionIndex() === sections - 1 && this.pageIndex() === this.pageCount() - 1;
  });

  /** Share of the whole book that lies before the end of the current page. */
  protected readonly percent = computed(() => {
    const book = this.parsed();
    const section = this.section();
    if (!book || !section || !book.length) return 0;
    const withinSection = (this.pageIndex() + 1) / this.pageCount();
    return Math.round(((section.offset + section.length * withinSection) / book.length) * 100);
  });

  protected readonly pageLabel = computed(
    () => `${this.title()}, page ${this.pageIndex() + 1} of ${this.pageCount()} in this part`,
  );

  constructor() {
    effect(() => {
      const id = this.id();
      if (this.library.ready()) untracked(() => void this.load(id));
    });

    afterNextRender(() => {
      const saved = this.storage.read('reader', DEFAULT_SETTINGS);
      if (FONTS.some((font) => font.id === saved.font) && SIZES[saved.size])
        this.settings.set(saved);

      // Rotating the phone or resizing the window changes how much fits on a page.
      const observer = new ResizeObserver(() => void this.relayout());
      observer.observe(this.stage().nativeElement);
      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        this.curl?.destroy();
      });
    });
  }

  // ---- Loading -------------------------------------------------------------

  protected async load(id: string): Promise<void> {
    this.status.set('loading');
    try {
      const parsed = await this.bookText.load(id);
      if (!parsed?.sections.length) {
        this.status.set('missing');
        return;
      }
      const saved = this.library.position(id);
      this.parsed.set(parsed);
      this.sectionIndex.set(Math.min(saved?.section ?? 0, parsed.sections.length - 1));
      this.status.set('ready');
      await this.relayout(saved?.ratio ?? 0);
    } catch {
      this.status.set('failed');
    }
  }

  // ---- Layout ----------------------------------------------------------------

  /**
   * Measures the rendered section and works out how many pages it makes.
   * `ratio` (0 to 1) says how far through the section to land. Without it the
   * reader stays at the same relative place, which is what a resize or a
   * font change should do.
   *
   * Passes can overlap (a resize while a book is still opening), so a
   * requested place is remembered until a pass has actually applied it;
   * otherwise a later pass with no request would overwrite it.
   */
  private async relayout(ratio?: number): Promise<void> {
    if (ratio !== undefined) this.requestedRatio = ratio;
    // Two frames: one for Angular to render the section, one for the browser to lay it out.
    await nextFrame();
    await nextFrame();
    const flow = this.flow()?.nativeElement;
    if (!flow) return;

    const landAt = this.requestedRatio ?? this.ratio();
    this.requestedRatio = null;

    const width = flow.clientWidth;
    const gap = parseFloat(getComputedStyle(flow).columnGap) || 0;
    flow.style.columnWidth = `${width}px`;

    const stride = width + gap;
    const count = Math.max(1, Math.round((flow.scrollWidth + gap) / stride));
    this.pageStride.set(stride);
    this.pageCount.set(count);
    this.pageIndex.set(Math.min(count - 1, Math.round(landAt * (count - 1))));
  }

  private ratio(): number {
    return this.pageCount() > 1 ? this.pageIndex() / (this.pageCount() - 1) : 0;
  }

  private savePosition(): void {
    this.library.savePosition(this.id(), {
      section: this.sectionIndex(),
      ratio: this.ratio(),
      percent: this.percent(),
    });
  }

  // ---- Turning pages -----------------------------------------------------------

  private canTurn(direction: 1 | -1): boolean {
    if (this.status() !== 'ready') return false;
    return direction === 1 ? !this.atEnd() : !this.atStart();
  }

  /** Moves to the neighbouring page, crossing into the next or previous section when needed. */
  private async step(direction: 1 | -1): Promise<void> {
    const target = this.pageIndex() + direction;
    if (target >= 0 && target < this.pageCount()) {
      this.pageIndex.set(target);
    } else {
      // Land on the first page of the next section, or the last page of the previous one.
      this.sectionIndex.update((index) => index + direction);
      await this.relayout(direction === 1 ? 0 : 1);
    }
    // Let Angular paint the new page before anything copies or uncovers it.
    await nextFrame();
  }

  /**
   * Freezes the current page in a curl, then moves the real page on underneath
   * it. Returns null when motion is reduced: the page then simply changes.
   */
  private async openCurl(direction: 1 | -1, corner: Corner): Promise<PageCurl | null> {
    const page = this.page()?.nativeElement;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const curl = page && !reducedMotion ? new PageCurl(this.stage().nativeElement, page) : null;
    curl?.begin(direction, corner);
    await this.step(direction);
    curl?.attach();
    return curl;
  }

  /** Turns one page with a full curl. Presses that arrive mid-turn are queued, not lost. */
  protected async turn(direction: 1 | -1): Promise<void> {
    if (this.turning) {
      this.queuedTurn = direction;
      return;
    }
    if (!this.canTurn(direction)) return;

    this.turning = true;
    this.settingsOpen.set(false);
    try {
      const curl = await this.openCurl(direction, 'bottom');
      this.curl = curl;
      this.savePosition();
      await curl?.play(this.turnSeconds());
      curl?.destroy();
    } finally {
      this.curl = null;
      this.turning = false;
    }

    const queued = this.queuedTurn;
    this.queuedTurn = null;
    if (queued) void this.turn(queued);
  }

  /** Narrow pages have less distance to travel, so they turn a little faster. */
  private turnSeconds(): number {
    const width = this.page()?.nativeElement.offsetWidth ?? 600;
    return width < 520 ? TURN_SECONDS_NARROW : TURN_SECONDS;
  }

  protected finish(): void {
    const finished = this.library.state().shelves.find((shelf) => shelf.id === 'finished');
    const book = this.library.book(this.id());
    if (finished && book) this.library.addToShelf(finished.id, book);
    this.notifier.show(
      finished ? `Finished. Moved onto “${finished.name}”.` : 'Finished. Well read.',
    );
    void this.router.navigate(['/book', this.id()]);
  }

  // ---- Input -----------------------------------------------------------------------

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.settingsOpen()) {
      this.settingsOpen.set(false);
      this.settingsButton().nativeElement.focus();
      return;
    }

    // Leave keys alone where a control already uses them: arrows move between
    // radio buttons, and Space presses whichever button or link has focus.
    const target = event.target as HTMLElement;
    const usesArrows = Boolean(target.closest?.('input, textarea, select'));
    const usesSpace = usesArrows || Boolean(target.closest?.('button, a'));

    const forward =
      event.key === 'PageDown' ||
      (event.key === 'ArrowRight' && !usesArrows) ||
      (event.key === ' ' && !usesSpace);
    const backward = event.key === 'PageUp' || (event.key === 'ArrowLeft' && !usesArrows);
    if (!forward && !backward) return;

    event.preventDefault();
    void this.turn(forward ? 1 : -1);
  }

  /*
   * Pointer gestures on the page:
   *  - a tap on the outer thirds turns forward or back;
   *  - a sideways drag picks the page up by its nearest corner, and it
   *    follows the finger until let go. It then finishes the turn if it was
   *    pulled far enough or flicked, and falls back otherwise.
   */

  protected onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || this.turning || this.status() !== 'ready') return;
    if ((event.target as HTMLElement).closest('a, button')) return;
    this.drag = {
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      latest: { x: event.clientX, y: event.clientY },
      lastTime: event.timeStamp,
      velocity: 0,
      state: 'pressed',
      direction: 1,
      released: false,
    };
  }

  protected onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;

    const elapsed = event.timeStamp - drag.lastTime;
    if (elapsed > 0) {
      // Smoothed, so one jittery sample does not decide whether a flick happened.
      const instant = (event.clientX - drag.latest.x) / elapsed;
      drag.velocity = drag.velocity * 0.4 + instant * 0.6;
    }
    drag.latest = { x: event.clientX, y: event.clientY };
    drag.lastTime = event.timeStamp;

    if (drag.state === 'dragging') {
      this.followPointer();
      return;
    }
    if (drag.state !== 'pressed') return;

    const dx = event.clientX - drag.start.x;
    const dy = event.clientY - drag.start.y;
    if (Math.hypot(dx, dy) < DRAG_START_PX) return;

    const direction = dx < 0 ? 1 : -1;
    if (Math.abs(dy) > Math.abs(dx) || !this.canTurn(direction)) {
      drag.state = 'ignored';
      return;
    }

    const page = this.page()?.nativeElement;
    if (!page) return;
    const rect = page.getBoundingClientRect();
    const corner: Corner = drag.start.y - rect.top < rect.height / 2 ? 'top' : 'bottom';

    drag.state = 'starting';
    drag.direction = direction;
    this.turning = true;
    this.dragging.set(true);
    this.settingsOpen.set(false);
    getSelection()?.removeAllRanges();
    this.stage().nativeElement.setPointerCapture(event.pointerId);

    void this.openCurl(direction, corner).then((curl) => {
      this.curl = curl;
      drag.state = 'dragging';
      this.followPointer();
      if (drag.released) void this.endDrag(drag);
    });
  }

  protected onPointerUp(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;

    if (drag.state === 'pressed') {
      this.drag = null;
      if (event.type === 'pointerup') this.onTap(event);
      return;
    }
    if (drag.state === 'ignored') {
      this.drag = null;
      return;
    }
    drag.released = true;
    // A drag still opening its curl finishes as soon as the curl is ready.
    if (drag.state === 'dragging') void this.endDrag(drag);
  }

  private followPointer(): void {
    const { drag, curl } = this;
    if (!drag || !curl) return;
    const base = drag.direction === 1 ? curl.flat : curl.over;
    curl.setPoint({
      x: base.x + (drag.latest.x - drag.start.x) * DRAG_GAIN,
      y: base.y + (drag.latest.y - drag.start.y),
    });
  }

  private async endDrag(drag: Drag): Promise<void> {
    this.drag = null;
    const curl = this.curl;
    const width = this.page()?.nativeElement.offsetWidth ?? 1;

    // Share of the turn already done, and the flick speed in the turning direction.
    const pulled = Math.abs(drag.latest.x - drag.start.x) * DRAG_GAIN;
    const progress = curl ? curl.progress : Math.min(1, pulled / (2 * width));
    const done = drag.direction === 1 ? progress : 1 - progress;
    const flick = drag.velocity * -drag.direction;
    const complete = flick > FLICK_SPEED || (flick > -FLICK_SPEED && done > 0.3);

    await curl?.release(complete);
    if (complete) this.savePosition();
    else await this.step(drag.direction === 1 ? -1 : 1);

    curl?.destroy();
    this.curl = null;
    this.turning = false;
    this.dragging.set(false);
  }

  private onTap(event: PointerEvent): void {
    const page = this.page()?.nativeElement;
    if (!page || getSelection()?.toString()) return;
    const rect = page.getBoundingClientRect();
    const across = (event.clientX - rect.left) / rect.width;
    if (across > 0.7) void this.turn(1);
    else if (across < 0.3) void this.turn(-1);
  }

  // ---- Settings ----------------------------------------------------------------------

  protected setFont(font: FontId): void {
    this.updateSettings({ ...this.settings(), font });
  }

  protected changeSize(step: 1 | -1): void {
    const size = Math.min(SIZES.length - 1, Math.max(0, this.settings().size + step));
    if (size !== this.settings().size) this.updateSettings({ ...this.settings(), size });
  }

  private updateSettings(settings: typeof DEFAULT_SETTINGS): void {
    this.settings.set(settings);
    this.storage.write('reader', settings);
    void this.relayout();
  }
}
