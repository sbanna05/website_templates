export type BookSource = 'classic' | 'openlibrary' | 'upload';

export interface Book {
  /** Route-safe and unique across sources, e.g. `classic-alice`, `ol-OL893414W`, `upload-k3x9`. */
  id: string;
  title: string;
  author: string;
  year: number | null;
  source: BookSource;
  /** Remote artwork. When null, a typeset cover is drawn instead. */
  coverUrl: string | null;
  /** True when Booknook holds the full text (bundled classic or the user's upload). */
  readable: boolean;
  description?: string;
}

export interface Shelf {
  id: string;
  name: string;
  bookIds: string[];
}

export interface Review {
  id: string;
  bookId: string;
  author: string;
  text: string;
  createdAt: string;
}

/** Where a reader stopped. `ratio` is the position inside the section, so it survives a font-size change. */
export interface ReadingPosition {
  section: number;
  ratio: number;
  percent: number;
}

export interface LibraryState {
  books: Record<string, Book>;
  shelves: Shelf[];
  ratings: Record<string, number>;
  reviews: Review[];
  positions: Record<string, ReadingPosition>;
}

/** Cloth colours for typeset covers and spines. Every one passes 4.5:1 against the cream cover text. */
const CLOTHS = [
  '#4a6650',
  '#7a2f42',
  '#5a64b0',
  '#8a6a2a',
  '#3f4f5e',
  '#a65a3a',
  '#2f4a43',
  '#5c3d5e',
];

/** Small stable hash, so a book always gets the same cloth and spine size. */
export function hashOf(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash;
}

export const clothFor = (bookId: string): string => CLOTHS[hashOf(bookId) % CLOTHS.length];

export const newId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
