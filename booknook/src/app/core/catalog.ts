import { Injectable } from '@angular/core';
import { Book } from './models';

/**
 * Where books come from:
 *  - six public-domain classics bundled with the site, readable in full;
 *  - the Open Library catalogue (openlibrary.org), searched live for
 *    everything else. Open Library provides details and covers, not the
 *    text, so those books can be shelved, rated and reviewed but not read.
 */

interface Classic extends Book {
  /** File name in public/library/. */
  slug: string;
}

export const CLASSICS: Classic[] = [
  {
    slug: 'alice',
    title: 'Alice’s Adventures in Wonderland',
    author: 'Lewis Carroll',
    year: 1865,
    description:
      'A bored girl follows a white rabbit down a hole and into a world where logic bends, size is negotiable and everyone is a little mad.',
  },
  {
    slug: 'jekyll-hyde',
    title: 'The Strange Case of Dr Jekyll and Mr Hyde',
    author: 'Robert Louis Stevenson',
    year: 1886,
    description:
      'A London lawyer investigates the link between his respectable friend Dr Jekyll and the violent Mr Hyde.',
  },
  {
    slug: 'time-machine',
    title: 'The Time Machine',
    author: 'H. G. Wells',
    year: 1895,
    description:
      'An inventor travels to the year 802,701 and finds humanity split into two species, with a secret between them.',
  },
  {
    slug: 'christmas-carol',
    title: 'A Christmas Carol',
    author: 'Charles Dickens',
    year: 1843,
    description:
      'Three spirits visit the miser Ebenezer Scrooge on Christmas Eve to show him what he was, is and may become.',
  },
  {
    slug: 'yellow-wallpaper',
    title: 'The Yellow Wallpaper',
    author: 'Charlotte Perkins Gilman',
    year: 1892,
    description:
      'Confined to a room for a "rest cure", a woman becomes fixed on the pattern of its wallpaper. A short story you can finish in one sitting.',
  },
  {
    slug: 'call-of-the-wild',
    title: 'The Call of the Wild',
    author: 'Jack London',
    year: 1903,
    description:
      'Buck, a stolen ranch dog, is sold into the Klondike gold rush and has to learn the law of the sled team.',
  },
].map((classic) => ({
  ...classic,
  id: `classic-${classic.slug}`,
  source: 'classic' as const,
  coverUrl: null,
  readable: true,
}));

export const classicTextUrl = (bookId: string): string | null => {
  const classic = CLASSICS.find((book) => book.id === bookId);
  return classic ? `/library/${classic.slug}.txt` : null;
};

interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
}

const SEARCH_URL = 'https://openlibrary.org/search.json';
const SEARCH_FIELDS = 'key,title,author_name,cover_i,first_publish_year';
const RESULT_LIMIT = 24;

function toBook(doc: OpenLibraryDoc): Book {
  return {
    id: `ol-${doc.key.replace('/works/', '')}`,
    title: doc.title,
    author: doc.author_name?.slice(0, 2).join(', ') ?? 'Unknown author',
    year: doc.first_publish_year ?? null,
    source: 'openlibrary',
    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
    readable: false,
  };
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Open Library answered ${response.status}`);
  return (await response.json()) as T;
}

@Injectable({ providedIn: 'root' })
export class Catalog {
  /** Bundled classics matching the query first, then Open Library results. */
  async search(query: string, signal?: AbortSignal): Promise<Book[]> {
    const needle = query.trim().toLowerCase();
    const classics = CLASSICS.filter((book) =>
      `${book.title} ${book.author}`.toLowerCase().includes(needle),
    );

    const params = new URLSearchParams({
      q: query.trim(),
      fields: SEARCH_FIELDS,
      limit: String(RESULT_LIMIT),
    });
    const result = await getJson<{ docs: OpenLibraryDoc[] }>(`${SEARCH_URL}?${params}`, signal);
    return [...classics, ...result.docs.filter((doc) => doc.title).map(toBook)];
  }

  /** Looks up one Open Library work by its Booknook id, with its description when there is one. */
  async find(bookId: string, signal?: AbortSignal): Promise<Book | null> {
    const classic = CLASSICS.find((book) => book.id === bookId);
    if (classic) return classic;
    if (!bookId.startsWith('ol-')) return null;

    const workKey = `/works/${bookId.slice(3)}`;
    const params = new URLSearchParams({ q: `key:${workKey}`, fields: SEARCH_FIELDS, limit: '1' });
    const [search, work] = await Promise.all([
      getJson<{ docs: OpenLibraryDoc[] }>(`${SEARCH_URL}?${params}`, signal),
      // The description is a bonus: the page still works if this second request fails.
      getJson<{ description?: string | { value: string } }>(
        `https://openlibrary.org${workKey}.json`,
        signal,
      ).catch(() => null),
    ]);

    const doc = search.docs[0];
    if (!doc) return null;
    const description =
      typeof work?.description === 'string' ? work.description : work?.description?.value;
    return { ...toBook(doc), description: description?.split('\n')[0] };
  }
}
