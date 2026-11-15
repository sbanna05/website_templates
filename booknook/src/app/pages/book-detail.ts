import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '../core/auth';
import { Catalog } from '../core/catalog';
import { Library } from '../core/library';
import { Book, Review, Shelf } from '../core/models';
import { Notifier } from '../core/notifier';
import { BookCover } from '../ui/book-cover';
import { Icon } from '../ui/icon';
import { StarRating } from '../ui/star-rating';
import { Tooltip } from '../ui/tooltip';

type Status = 'loading' | 'ready' | 'missing' | 'failed';

const MAX_REVIEW_LENGTH = 2000;

/** One book: details, the way into the reader, its shelves, and the reader's rating and reviews. */
@Component({
  selector: 'app-book-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, BookCover, StarRating, Icon, Tooltip],
  template: `
    <div class="page pt-8 md:pt-12">
      @switch (status()) {
        @case ('loading') {
          <div class="grid gap-8 md:grid-cols-[240px_1fr]" role="status">
            <span class="visually-hidden">Loading the book</span>
            <div class="skeleton mx-auto aspect-[2/3] w-44 md:w-full"></div>
            <div class="grid content-start gap-4">
              <div class="skeleton h-12 w-4/5"></div>
              <div class="skeleton h-5 w-2/5"></div>
              <div class="skeleton h-24"></div>
            </div>
          </div>
        }
        @case ('missing') {
          <h1 class="text-4xl">That book is not in the catalogue</h1>
          <p class="lede mt-3">It may have been removed, or the link may be incomplete.</p>
          <a class="btn btn-primary mt-6" routerLink="/browse">Browse books</a>
        }
        @case ('failed') {
          <div role="alert">
            <h1 class="text-4xl">The catalogue did not answer</h1>
            <p class="lede mt-3">Check your connection, then load the book again.</p>
            <button type="button" class="btn btn-primary mt-6" (click)="load(id())">
              Load the book again
            </button>
          </div>
        }
        @case ('ready') {
          @if (book(); as book) {
            <article class="grid gap-8 md:grid-cols-[240px_1fr] md:gap-12">
              <div class="mx-auto w-44 md:w-full">
                <app-book-cover [book]="book" />
              </div>

              <div class="min-w-0">
                <h1 class="text-4xl md:text-5xl">{{ book.title }}</h1>
                <p class="num mt-3 text-lg text-ink-soft">{{ byline() }}</p>

                @if (book.description) {
                  <p class="mt-5 max-w-[65ch]">{{ book.description }}</p>
                }

                <div class="mt-6">
                  @if (book.readable) {
                    <a class="btn btn-primary btn-lg" [routerLink]="['/read', book.id]">
                      <app-icon name="book" />
                      @if (progress(); as percent) {
                        Continue reading <span class="num">({{ percent }}%)</span>
                      } @else {
                        Read now
                      }
                    </a>
                  } @else {
                    <p class="card max-w-[60ch] text-ink-soft">
                      Booknook has this book’s details but not its text. Own a copy as a text file?
                      <a routerLink="/shelves">Upload it from My shelves</a> to read it here.
                    </p>
                  }
                </div>

                <section class="mt-10" aria-labelledby="shelves-heading">
                  <h2 id="shelves-heading" class="text-2xl">Keep it on a shelf</h2>
                  @if (shelves().length) {
                    <ul class="mt-3 grid list-none gap-1 p-0 sm:grid-cols-2">
                      @for (shelf of shelves(); track shelf.id) {
                        <li>
                          <label class="shelf-option">
                            <input
                              type="checkbox"
                              [checked]="shelf.bookIds.includes(book.id)"
                              (change)="toggleShelf(shelf, book)"
                            />
                            <span>{{ shelf.name }}</span>
                          </label>
                        </li>
                      }
                    </ul>
                  } @else {
                    <p class="mt-3 text-ink-soft">
                      You have no shelves yet. <a routerLink="/shelves">Create a shelf</a> first.
                    </p>
                  }
                </section>

                <section class="mt-10" aria-labelledby="rating-heading">
                  <h2 id="rating-heading" class="text-2xl">Rate this book</h2>
                  <div class="mt-2 flex flex-wrap items-center gap-x-4">
                    <app-star-rating
                      [value]="rating()"
                      [legend]="'Your rating for ' + book.title"
                      (rated)="rate($event, book)"
                    />
                    <p class="num text-sm text-ink-soft" aria-live="polite">
                      {{ rating() ? 'You gave it ' + rating() + ' of 5' : 'Not rated yet' }}
                    </p>
                  </div>
                </section>

                <section class="mt-10" aria-labelledby="reviews-heading">
                  <h2 id="reviews-heading" class="text-2xl">Your reviews</h2>

                  @if (auth.user(); as user) {
                    <form
                      class="mt-4 max-w-2xl"
                      novalidate
                      (submit)="postReview($event, book, user.name)"
                    >
                      <label class="field-label" for="review-text">What did you think?</label>
                      <textarea
                        #reviewText
                        id="review-text"
                        class="field"
                        rows="4"
                        [attr.maxlength]="maxReviewLength"
                        [value]="draft()"
                        [attr.aria-invalid]="reviewError() ? 'true' : null"
                        aria-describedby="review-note"
                        (input)="draft.set(reviewText.value); reviewError.set(null)"
                      ></textarea>
                      <p
                        id="review-note"
                        class="field-note"
                        [class.is-error]="reviewError()"
                        [attr.role]="reviewError() ? 'alert' : null"
                      >
                        {{ reviewError() ?? 'Posting as ' + user.name + '.' }}
                      </p>
                      <button type="submit" class="btn btn-primary mt-2">Post review</button>
                    </form>
                  } @else {
                    <p class="card mt-4 max-w-2xl">
                      <a routerLink="/login">Sign in</a> or
                      <a routerLink="/register">create an account</a> to post a review.
                    </p>
                  }

                  @if (reviews().length) {
                    <ul class="mt-6 grid max-w-2xl list-none gap-3 p-0">
                      @for (review of reviews(); track review.id) {
                        <li class="card">
                          <div class="flex items-start justify-between gap-3">
                            <p class="text-sm">
                              <span class="font-bold">{{ review.author }}</span><span
                                class="num text-ink-soft"
                                >, {{ review.createdAt | date: 'd MMM y' }}</span
                              >
                            </p>
                            <button
                              type="button"
                              class="icon-btn -mr-2 -mt-2"
                              aria-label="Delete review"
                              appTooltip="Delete review"
                              (click)="deleteReview(review)"
                            >
                              <app-icon name="trash" [size]="18" />
                            </button>
                          </div>
                          <p class="mt-1 whitespace-pre-line">{{ review.text }}</p>
                        </li>
                      }
                    </ul>
                  } @else {
                    <p class="mt-6 text-ink-soft">
                      No reviews yet. Yours will appear here once you post it.
                    </p>
                  }
                </section>
              </div>
            </article>
          }
        }
      }
    </div>
  `,
  styles: `
    .shelf-option {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 44px;
      padding: 0 12px;
      border: 1px solid var(--line);
      border-radius: var(--radius-control);
      background: var(--surface);
      font-weight: 600;
      cursor: pointer;
    }

    .shelf-option:has(:checked) {
      border-color: var(--accent-text);
      background: var(--accent-wash);
    }

    .shelf-option input {
      width: 20px;
      height: 20px;
      accent-color: var(--accent);
    }
  `,
})
export class BookDetail {
  /** Bound from the `:id` route parameter. */
  readonly id = input.required<string>();

  protected readonly auth = inject(Auth);
  private readonly library = inject(Library);
  private readonly catalog = inject(Catalog);
  private readonly notifier = inject(Notifier);

  protected readonly maxReviewLength = MAX_REVIEW_LENGTH;
  protected readonly status = signal<Status>('loading');
  /** Details fetched from the catalogue for a book that is not saved in the library yet. */
  private readonly fetched = signal<Book | null>(null);
  protected readonly draft = signal('');
  protected readonly reviewError = signal<string | null>(null);

  protected readonly book = computed(() => this.library.book(this.id()) ?? this.fetched());
  /** "Author, first published year", built here so no template whitespace lands before the comma. */
  protected readonly byline = computed(() => {
    const book = this.book();
    if (!book) return '';
    return book.year ? `${book.author}, first published ${book.year}` : book.author;
  });
  protected readonly shelves = computed(() => this.library.state().shelves);
  protected readonly rating = computed(() => this.library.state().ratings[this.id()] ?? 0);
  protected readonly reviews = computed(() => this.library.reviewsFor(this.id()));
  protected readonly progress = computed(() => this.library.position(this.id())?.percent ?? 0);

  constructor() {
    // Wait for saved data first: a shelved book needs no network request at all.
    effect(() => {
      const id = this.id();
      // Untracked, so later library changes (a rating, a shelf) do not reload the page.
      if (this.library.ready()) untracked(() => void this.load(id));
    });
  }

  protected async load(id: string): Promise<void> {
    this.fetched.set(null);
    const saved = this.library.book(id);
    if (saved) {
      this.status.set('ready');
      // A book shelved straight from search results has no description yet;
      // fetch it quietly and keep it. The page is already usable without it.
      if (saved.source === 'openlibrary' && saved.description === undefined) {
        this.catalog
          .find(id)
          .then((details) =>
            this.library.saveBook({ ...saved, description: details?.description ?? '' }),
          )
          .catch(() => undefined);
      }
      return;
    }
    this.status.set('loading');
    try {
      const book = await this.catalog.find(id);
      this.fetched.set(book);
      this.status.set(book ? 'ready' : 'missing');
    } catch {
      this.status.set('failed');
    }
  }

  protected toggleShelf(shelf: Shelf, book: Book): void {
    if (shelf.bookIds.includes(book.id)) {
      this.library.removeFromShelf(shelf.id, book.id);
      this.notifier.show(`Removed from ${shelf.name}`);
    } else {
      this.library.addToShelf(shelf.id, book);
      this.notifier.show(`Added to ${shelf.name}`);
    }
  }

  protected rate(stars: number, book: Book): void {
    this.library.saveBook(book);
    this.library.rate(book.id, stars);
  }

  protected postReview(event: Event, book: Book, author: string): void {
    event.preventDefault();
    if (!this.draft().trim()) {
      this.reviewError.set('Write a few words before posting.');
      return;
    }
    this.library.saveBook(book);
    this.library.addReview(book.id, author, this.draft());
    this.draft.set('');
    this.notifier.show('Review posted');
  }

  /** Deletes straight away and offers Undo, instead of interrupting with a confirmation. */
  protected deleteReview(review: Review): void {
    const before = this.library.state();
    this.library.deleteReview(review.id);
    this.notifier.show('Review deleted', {
      label: 'Undo',
      run: () => this.library.restoreSnapshot(before),
    });
  }
}
