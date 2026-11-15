import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import { Book, clothFor, hashOf } from '../core/models';
import { BookCover } from './book-cover';

const SPINE_WIDTHS = [30, 34, 38, 42, 46];
const SPINE_HEIGHTS = [164, 172, 180, 188, 196];

/**
 * One shelf of books standing in 3D. Each book links to its page; hovering
 * or focusing one pulls it out far enough to show its cover. The geometry
 * lives in src/styles/shelf.css.
 */
@Component({
  selector: 'app-shelf-3d',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BookCover],
  template: `
    <div class="shelf" [class.shelf-showcase]="showcase()">
      @if (books().length) {
        <div class="shelf-scroll">
          <ul class="shelf-row" #row>
            @for (book of books(); track book.id) {
              <li class="shelf-slot">
                <a
                  class="spine"
                  [class.is-featured]="showcase() && $index === featuredIndex"
                  [routerLink]="['/book', book.id]"
                  [style.--cloth]="cloth(book)"
                  [style.--spine-width.px]="spineWidth(book)"
                  [style.--spine-height.px]="spineHeight(book)"
                  [attr.aria-label]="book.title + ' by ' + book.author"
                >
                  <span class="spine-face" aria-hidden="true">
                    <span class="spine-title">{{ book.title }}</span>
                  </span>
                  <span class="spine-cover" aria-hidden="true">
                    <app-book-cover [book]="book" decorative />
                  </span>
                </a>
              </li>
            }
          </ul>
        </div>
      } @else {
        <p class="shelf-empty">{{ emptyText() }}</p>
      }
      <div class="shelf-board"></div>
    </div>
  `,
})
export class Shelf3d {
  readonly books = input.required<Book[]>();
  readonly emptyText = input('This shelf is empty.');
  /** Larger, centred books with one already pulled out, to show what the shelf does. */
  readonly showcase = input(false, { transform: booleanAttribute });

  protected readonly featuredIndex = 2;

  private readonly row = viewChild<ElementRef<HTMLElement>>('row');

  protected readonly cloth = (book: Book): string => clothFor(book.id);
  protected readonly spineWidth = (book: Book): number =>
    SPINE_WIDTHS[hashOf(book.id) % SPINE_WIDTHS.length];
  protected readonly spineHeight = (book: Book): number =>
    SPINE_HEIGHTS[hashOf(book.title) % SPINE_HEIGHTS.length];

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

    // Books drop onto the shelf one after another the first time it scrolls into view.
    afterNextRender(() => {
      const row = this.row()?.nativeElement;
      if (!row || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const slots = [...row.children];
      gsap.set(slots, { y: -48, opacity: 0 });

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          observer.disconnect();
          gsap.to(slots, {
            y: 0,
            opacity: 1,
            duration: 0.55,
            ease: 'bounce.out',
            stagger: 0.06,
            clearProps: 'transform,opacity',
          });
        },
        { threshold: 0.3 },
      );
      observer.observe(host);
    });
  }
}
