import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import { CLASSICS } from '../core/catalog';
import { BookCover } from '../ui/book-cover';
import { Icon } from '../ui/icon';
import { Shelf3d } from '../ui/shelf-3d';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Shelf3d, BookCover, Icon],
  template: `
    <section class="page grid items-center gap-10 pb-16 pt-10 md:grid-cols-[5fr_6fr] md:pt-20">
      <div #intro>
        <h1 class="text-[clamp(2.5rem,9vw,4.25rem)]">
          Your books, standing on a shelf you can reach into
        </h1>
        <p class="lede mt-5 max-w-[46ch]">
          Booknook keeps what you read, want to read and have finished on 3D shelves. Open a classic
          and turn its pages, or search millions of titles to rate and review.
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <a class="btn btn-primary btn-lg" routerLink="/browse">Browse books</a>
          <a class="btn btn-lg" routerLink="/shelves">Open my shelves</a>
        </div>
      </div>

      <div>
        <app-shelf-3d [books]="classics" showcase />
        <p class="mt-3 text-sm text-ink-soft">
          Six classics to start with. Pick one up to see its cover.
        </p>
      </div>
    </section>

    <section class="page py-12" aria-labelledby="classics-heading">
      <h2 id="classics-heading" class="text-3xl md:text-4xl">
        Six classics you can read right now
      </h2>
      <p class="lede mt-3 max-w-[60ch]">
        Complete, free and out of copyright. Booknook remembers your page.
      </p>

      <ul class="mt-8 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        @for (book of classics; track book.id) {
          <li class="card grid grid-cols-[88px_1fr] gap-4">
            <app-book-cover [book]="book" decorative />
            <div class="flex min-w-0 flex-col">
              <h3 class="text-xl">
                <a [routerLink]="['/book', book.id]" class="text-ink no-underline">
                  {{ book.title }}
                </a>
              </h3>
              <p class="mt-1 text-sm text-ink-soft">
                {{ book.author }}<span class="num">, {{ book.year }}</span>
              </p>
              <a class="btn mt-auto self-start" [routerLink]="['/read', book.id]">
                <app-icon name="book" [size]="18" />
                Read now<span class="visually-hidden">: {{ book.title }}</span>
              </a>
            </div>
          </li>
        }
      </ul>
    </section>

    <section class="page py-12" aria-labelledby="search-heading">
      <div class="card grid gap-6 p-6 md:grid-cols-2 md:items-center md:p-10">
        <div>
          <h2 id="search-heading" class="text-3xl md:text-4xl">Looking for a particular book?</h2>
          <p class="lede mt-3">
            Search the Open Library catalogue by title or author and add what you find to a shelf.
          </p>
        </div>
        <form role="search" (submit)="search($event, query.value)">
          <label class="field-label" for="home-search">Title or author</label>
          <div class="flex flex-col gap-3 sm:flex-row">
            <input
              #query
              id="home-search"
              class="field"
              type="search"
              name="q"
              autocomplete="off"
            />
            <button type="submit" class="btn btn-primary">
              <app-icon name="search" [size]="18" />
              Search books
            </button>
          </div>
        </form>
      </div>
    </section>
  `,
})
export class Home {
  private readonly router = inject(Router);
  private readonly intro = viewChild.required<ElementRef<HTMLElement>>('intro');

  protected readonly classics = CLASSICS;

  constructor() {
    // Headline, text and buttons rise in one after another on first load.
    afterNextRender(() => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.from(this.intro().nativeElement.children, {
        y: 28,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.09,
        clearProps: 'transform,opacity',
      });
    });
  }

  protected search(event: Event, query: string): void {
    event.preventDefault();
    void this.router.navigate(['/browse'], {
      queryParams: query.trim() ? { q: query.trim() } : {},
    });
  }
}
