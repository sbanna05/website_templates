import { Injectable, afterNextRender, inject, signal } from '@angular/core';
import { BrowserStorage } from './browser-storage';
import { CLASSICS } from './catalog';
import { Book, LibraryState, ReadingPosition, Review, Shelf, newId } from './models';

const classicId = (slug: string): string => `classic-${slug}`;

/** A new visitor starts with the classics already shelved, so the 3D shelves are never empty. */
function starterState(): LibraryState {
  return {
    books: Object.fromEntries(CLASSICS.map((book) => [book.id, book])),
    shelves: [
      {
        id: 'reading',
        name: 'Reading now',
        bookIds: [classicId('alice'), classicId('time-machine')],
      },
      {
        id: 'want',
        name: 'Want to read',
        bookIds: ['jekyll-hyde', 'christmas-carol', 'call-of-the-wild', 'yellow-wallpaper'].map(
          classicId,
        ),
      },
      { id: 'finished', name: 'Finished', bookIds: [] },
    ],
    ratings: {},
    reviews: [],
    positions: {},
  };
}

/** Accepts only a state with the expected shape, so a corrupt save cannot break the app. */
function restore(saved: LibraryState | null): LibraryState {
  const fresh = starterState();
  if (!saved || !Array.isArray(saved.shelves) || typeof saved.books !== 'object') return fresh;
  return {
    books: { ...fresh.books, ...saved.books },
    shelves: saved.shelves.filter((shelf) => shelf?.id && Array.isArray(shelf.bookIds)),
    ratings: saved.ratings ?? {},
    reviews: Array.isArray(saved.reviews) ? saved.reviews : [],
    positions: saved.positions ?? {},
  };
}

/**
 * The reader's own library: shelves, ratings, reviews and reading positions.
 * Kept in this browser until there is a backend. Every change goes through
 * `update`, which saves immediately.
 */
@Injectable({ providedIn: 'root' })
export class Library {
  private readonly storage = inject(BrowserStorage);

  readonly state = signal<LibraryState>(starterState());
  /** False until saved data has been read; pages show a loading state meanwhile. */
  readonly ready = signal(false);
  readonly saveFailed = signal(false);

  constructor() {
    // Restored after hydration so the server-rendered and first client render match.
    afterNextRender(() => {
      this.state.set(restore(this.storage.read<LibraryState | null>('library', null)));
      this.ready.set(true);
    });
  }

  private update(change: (state: LibraryState) => LibraryState): void {
    this.state.update(change);
    this.saveFailed.set(!this.storage.write('library', this.state()));
  }

  /** Puts back an earlier state. Used by Undo. */
  restoreSnapshot(snapshot: LibraryState): void {
    this.update(() => snapshot);
  }

  book(id: string): Book | null {
    return this.state().books[id] ?? null;
  }

  booksOn(shelf: Shelf): Book[] {
    const { books } = this.state();
    return shelf.bookIds.map((id) => books[id]).filter(Boolean);
  }

  shelvesHolding(bookId: string): Shelf[] {
    return this.state().shelves.filter((shelf) => shelf.bookIds.includes(bookId));
  }

  saveBook(book: Book): void {
    this.update((state) => ({ ...state, books: { ...state.books, [book.id]: book } }));
  }

  addToShelf(shelfId: string, book: Book): void {
    this.update((state) => ({
      ...state,
      books: { ...state.books, [book.id]: book },
      shelves: state.shelves.map((shelf) =>
        shelf.id === shelfId && !shelf.bookIds.includes(book.id)
          ? { ...shelf, bookIds: [...shelf.bookIds, book.id] }
          : shelf,
      ),
    }));
  }

  removeFromShelf(shelfId: string, bookId: string): void {
    this.update((state) => ({
      ...state,
      shelves: state.shelves.map((shelf) =>
        shelf.id === shelfId
          ? { ...shelf, bookIds: shelf.bookIds.filter((id) => id !== bookId) }
          : shelf,
      ),
    }));
  }

  createShelf(name: string): Shelf {
    const shelf: Shelf = { id: newId('shelf'), name: name.trim(), bookIds: [] };
    this.update((state) => ({ ...state, shelves: [...state.shelves, shelf] }));
    return shelf;
  }

  renameShelf(shelfId: string, name: string): void {
    this.update((state) => ({
      ...state,
      shelves: state.shelves.map((shelf) =>
        shelf.id === shelfId ? { ...shelf, name: name.trim() } : shelf,
      ),
    }));
  }

  deleteShelf(shelfId: string): void {
    this.update((state) => ({
      ...state,
      shelves: state.shelves.filter((shelf) => shelf.id !== shelfId),
    }));
  }

  rate(bookId: string, stars: number): void {
    this.update((state) => ({ ...state, ratings: { ...state.ratings, [bookId]: stars } }));
  }

  reviewsFor(bookId: string): Review[] {
    return this.state().reviews.filter((review) => review.bookId === bookId);
  }

  addReview(bookId: string, author: string, text: string): void {
    const review: Review = {
      id: newId('review'),
      bookId,
      author,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    this.update((state) => ({ ...state, reviews: [review, ...state.reviews] }));
  }

  deleteReview(reviewId: string): void {
    this.update((state) => ({
      ...state,
      reviews: state.reviews.filter((review) => review.id !== reviewId),
    }));
  }

  position(bookId: string): ReadingPosition | null {
    return this.state().positions[bookId] ?? null;
  }

  savePosition(bookId: string, position: ReadingPosition): void {
    this.update((state) => ({ ...state, positions: { ...state.positions, [bookId]: position } }));
  }
}
