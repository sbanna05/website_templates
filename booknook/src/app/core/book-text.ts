import { Injectable } from '@angular/core';
import { classicTextUrl } from './catalog';

/**
 * Full texts: bundled classics are fetched from this site's own
 * /library folder; uploads are kept in IndexedDB, because a whole book is
 * too large for localStorage.
 *
 * Every format ends up as the same list of headings and paragraphs, so the
 * reader never needs to know whether a book started as TXT, EPUB or PDF.
 */

export interface Block {
  kind: 'heading' | 'paragraph';
  text: string;
}

/** A run of blocks small enough to lay out quickly. The reader shows one section at a time. */
export interface Section {
  blocks: Block[];
  /** Characters before this section, for whole-book progress. */
  offset: number;
  length: number;
}

export interface ParsedBook {
  sections: Section[];
  length: number;
}

/** How an upload is kept in IndexedDB. Older uploads were stored as a plain string. */
interface StoredBook {
  version: 2;
  blocks: Block[];
}

const DATABASE = 'booknook';
const STORE = 'texts';
const SECTION_TARGET_CHARS = 9000;
const HEADING_PATTERN = /^(chapter|stave|book|part|epilogue|prologue|preface|contents)\b/i;
/** Transcriber's markers that are not part of the work. */
const NOISE_PATTERN = /^(\[illustration[^\]]*\]|cover)$/i;

function isHeading(lines: string[]): boolean {
  if (lines.length > 2) return false;
  const text = lines.join(' ');
  if (text.length > 70) return false;
  const isShoutedTitle = text === text.toUpperCase() && /[A-Z]{3}/.test(text);
  return HEADING_PATTERN.test(text) || isShoutedTitle;
}

/**
 * Turns plain text into headings and paragraphs. Paragraphs are separated
 * by blank lines; the hard line breaks inside them (common in plain-text
 * books) are joined so the text can reflow to any page size.
 */
export function textToBlocks(raw: string): Block[] {
  return raw
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((chunk) =>
      chunk
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    )
    .filter((lines) => lines.length && !NOISE_PATTERN.test(lines.join(' ')))
    .map((lines) => ({
      kind: isHeading(lines) ? ('heading' as const) : ('paragraph' as const),
      text: lines.join(' ').replace(/_/g, ''),
    }));
}

/** Groups blocks into sections, starting a new one at a chapter heading where possible. */
export function sectionize(blocks: Block[]): ParsedBook {
  const sections: Section[] = [];
  let current: Block[] = [];
  let currentLength = 0;
  let offset = 0;

  const close = () => {
    if (!current.length) return;
    sections.push({ blocks: current, offset, length: currentLength });
    offset += currentLength;
    current = [];
    currentLength = 0;
  };

  for (const block of blocks) {
    // Start a new section at a heading once the current one is big enough,
    // so chapters begin on a fresh page where possible.
    const atBreak = block.kind === 'heading' && currentLength > SECTION_TARGET_CHARS / 3;
    if (atBreak || currentLength > SECTION_TARGET_CHARS) close();
    current.push(block);
    currentLength += block.text.length;
  }
  close();

  return { sections, length: offset };
}

export const parseBook = (raw: string): ParsedBook => sectionize(textToBlocks(raw));

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(database.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

@Injectable({ providedIn: 'root' })
export class BookText {
  /** Resolves with the book laid out in sections, or null when Booknook does not hold its text. */
  async load(bookId: string): Promise<ParsedBook | null> {
    const url = classicTextUrl(bookId);
    if (url) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Could not load ${url}`);
      return parseBook(await response.text());
    }
    if (bookId.startsWith('upload-')) {
      const stored = await withStore<StoredBook | string | undefined>('readonly', (store) =>
        store.get(bookId),
      );
      if (stored === undefined) return null;
      return typeof stored === 'string' ? parseBook(stored) : sectionize(stored.blocks);
    }
    return null;
  }

  saveUpload(bookId: string, blocks: Block[]): Promise<IDBValidKey> {
    const stored: StoredBook = { version: 2, blocks };
    return withStore('readwrite', (store) => store.put(stored, bookId));
  }
}
