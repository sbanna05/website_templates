import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { CLASSICS, Catalog } from '../core/catalog';
import { Book } from '../core/models';
import { BookCard } from '../ui/book-card';
import { Icon } from '../ui/icon';

type Status = 'idle' | 'loading' | 'ready' | 'failed';

/**
 * Catalogue search. The query lives in the URL (`/browse?q=dune`), so a
 * search can be bookmarked, shared and reached with the back button.
 */
@Component({
  selector: 'app-browse',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BookCard, Icon],
  template: `
    <div class="page pt-10">
      <h1 class="text-4xl md:text-5xl">Find a book to shelve, rate or read</h1>

      <form class="mt-8 max-w-2xl" role="search" (submit)="submit($event, field.value)">
        <label class="field-label" for="browse-search">Title or author</label>
        <div class="flex flex-col gap-3 sm:flex-row">
          <input
            #field
            id="browse-search"
            class="field"
            type="search"
            name="q"
            autocomplete="off"
            [value]="q() ?? ''"
          />
          <button type="submit" class="btn btn-primary">
            <app-icon name="search" [size]="18" />
            Search books
          </button>
        </div>
      </form>

      <section
        class="mt-10"
        aria-labelledby="results-heading"
        [attr.aria-busy]="status() === 'loading'"
      >
        <h2 id="results-heading" class="text-2xl" aria-live="polite">{{ heading() }}</h2>

        @switch (status()) {
          @case ('loading') {
            <ul class="results" aria-hidden="true">
              @for (placeholder of placeholders; track placeholder) {
                <li class="card flex flex-col gap-3">
                  <div class="skeleton aspect-[2/3]"></div>
                  <div class="skeleton h-4 w-4/5"></div>
                  <div class="skeleton h-4 w-1/2"></div>
                  <div class="skeleton h-11"></div>
                </li>
              }
            </ul>
          }
          @case ('failed') {
            <div class="card mt-6 max-w-xl p-6" role="alert">
              <p class="font-semibold">The catalogue did not answer.</p>
              <p class="mt-1 text-ink-soft">
                Check your connection, then search again. The classics below still work offline.
              </p>
              <button type="button" class="btn mt-4" (click)="run(q() ?? '')">Search again</button>
            </div>
            <ul class="results">
              @for (book of classics; track book.id) {
                <li class="contents"><app-book-card [book]="book" /></li>
              }
            </ul>
          }
          @default {
            @if (results().length) {
              <ul class="results">
                @for (book of results(); track book.id) {
                  <li class="contents"><app-book-card [book]="book" /></li>
                }
              </ul>
            } @else {
              <div class="card mt-6 max-w-xl p-6">
                <p class="font-semibold">No book matches “{{ q() }}”.</p>
                <p class="mt-1 text-ink-soft">
                  Check the spelling, or search by the author’s surname instead.
                </p>
              </div>
            }
          }
        }
      </section>
    </div>
  `,
  styles: `
    .results {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 12px;
      margin: 24px 0 0;
      padding: 0;
      list-style: none;
    }

    @media (min-width: 768px) {
      .results {
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 16px;
      }
    }
  `,
})
export class Browse {
  /** Bound from the `?q=` query parameter. */
  readonly q = input<string>();

  private readonly catalog = inject(Catalog);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private request: AbortController | null = null;

  protected readonly classics = CLASSICS;
  protected readonly placeholders = Array.from({ length: 8 }, (_, index) => index);
  protected readonly status = signal<Status>('idle');
  protected readonly results = signal<Book[]>(CLASSICS);

  constructor() {
    effect(() => this.run(this.q() ?? ''));
    inject(DestroyRef).onDestroy(() => this.request?.abort());
  }

  protected heading(): string {
    const query = this.q()?.trim();
    if (!query) return 'Free classics to start with';
    switch (this.status()) {
      case 'loading':
        return `Searching for “${query}”`;
      case 'failed':
        return 'Free classics to start with';
      default: {
        const count = this.results().length;
        return `${count} ${count === 1 ? 'book' : 'books'} for “${query}”`;
      }
    }
  }

  protected submit(event: Event, value: string): void {
    event.preventDefault();
    const query = value.trim();
    // Searching the same words again (after a failure, say) would not change the URL.
    if (query === (this.q() ?? '')) this.run(query);
    else void this.router.navigate([], { queryParams: query ? { q: query } : {} });
  }

  protected async run(query: string): Promise<void> {
    this.request?.abort();
    if (!query.trim()) {
      this.results.set(CLASSICS);
      this.status.set('idle');
      return;
    }
    // The prerendered page shows the loading state; the search itself runs in the browser.
    this.status.set('loading');
    if (!this.isBrowser) return;

    const request = new AbortController();
    this.request = request;
    try {
      this.results.set(await this.catalog.search(query, request.signal));
      this.status.set('ready');
    } catch {
      // A newer search replaced this one; its result will arrive instead.
      if (!request.signal.aborted) this.status.set('failed');
    }
  }
}
