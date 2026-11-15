import { Unzipped, strFromU8, unzipSync } from 'fflate';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Block, textToBlocks } from './book-text';

/**
 * Turns an uploaded TXT, EPUB or PDF file into headings and paragraphs,
 * plus whatever title, author and cover the file itself carries. Runs
 * entirely in the browser; nothing is uploaded anywhere.
 */

export type BookFormat = 'txt' | 'epub' | 'pdf';

export interface ImportedBook {
  format: BookFormat;
  title: string | null;
  author: string | null;
  blocks: Block[];
  /** A small JPEG data URL, so the cover survives in localStorage with the rest of the book. */
  coverDataUrl: string | null;
}

/** A problem worth showing to the reader. The message says what to do next. */
export class ImportError extends Error {}

export const ACCEPTED_FILES = '.epub,.pdf,.txt,application/epub+zip,application/pdf,text/plain';
export const MAX_IMPORT_BYTES = 50 * 1024 * 1024;

const COVER_WIDTH = 260;
const MIN_PDF_TEXT_CHARS = 200;
/** pdf.js parses in a worker; the build copies its script to this path (see angular.json). */
const PDF_WORKER_URL = '/pdfjs/pdf.worker.min.mjs';

export function formatOf(file: File): BookFormat | null {
  const name = file.name.toLowerCase();
  if (name.endsWith('.epub') || file.type === 'application/epub+zip') return 'epub';
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf';
  if (name.endsWith('.txt') || file.type === 'text/plain') return 'txt';
  return null;
}

/** "the_time-machine.epub" becomes "the time machine". Used only when the file has no title. */
const titleFromFileName = (name: string): string =>
  name
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim();

const normalise = (text: string | null | undefined): string =>
  (text ?? '').replace(/\s+/g, ' ').trim();

export async function importBook(
  file: File,
  onProgress?: (message: string) => void,
): Promise<ImportedBook> {
  const format = formatOf(file);
  if (!format) throw new ImportError('Choose an EPUB, PDF or TXT file.');
  if (file.size > MAX_IMPORT_BYTES) {
    throw new ImportError('That file is over 50 MB. Choose a smaller one.');
  }

  const book =
    format === 'epub'
      ? await importEpub(file)
      : format === 'pdf'
        ? await importPdf(file, onProgress)
        : await importText(file);

  if (!book.blocks.length) throw new ImportError('That file has no readable text in it.');
  return { ...book, title: book.title || titleFromFileName(file.name) };
}

// ---- Plain text ---------------------------------------------------------------

async function importText(file: File): Promise<ImportedBook> {
  return {
    format: 'txt',
    title: null,
    author: null,
    blocks: textToBlocks(await file.text()),
    coverDataUrl: null,
  };
}

// ---- EPUB ------------------------------------------------------------------------

/** Text-holding elements. Only the innermost match is used, so nested ones are not read twice. */
const BLOCK_SELECTOR = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,pre,dt,dd,figcaption';

function parseXml(text: string, type: DOMParserSupportedType = 'application/xml'): Document {
  const document = new DOMParser().parseFromString(text, type);
  if (document.getElementsByTagName('parsererror').length) {
    // Many EPUBs ship XHTML that is not well-formed XML; the HTML parser forgives that.
    return new DOMParser().parseFromString(text, 'text/html');
  }
  return document;
}

const byTag = (root: Document | Element, tag: string): Element[] => [
  ...root.getElementsByTagNameNS('*', tag),
];

/** Resolves `href` relative to the file at `base`, both being paths inside the zip. */
function resolvePath(base: string, href: string): string {
  const url = new URL(href, `https://epub.invalid/${base}`);
  return decodeURIComponent(url.pathname.slice(1));
}

function readZip(bytes: Uint8Array, wanted: (name: string) => boolean): Unzipped {
  try {
    return unzipSync(bytes, { filter: (file) => wanted(file.name) });
  } catch {
    throw new ImportError('This EPUB could not be opened. The file may be damaged.');
  }
}

function documentBlocks(document: Document): Block[] {
  const body = document.body ?? byTag(document, 'body')[0] ?? document.documentElement;
  const matches = [...body.querySelectorAll(BLOCK_SELECTOR)];
  const innermost = matches.filter((element) => !element.querySelector(BLOCK_SELECTOR));

  if (!innermost.length) return textToBlocks(body.textContent ?? '');

  return innermost
    .map((element) => ({
      kind: /^h[1-6]$/i.test(element.localName) ? ('heading' as const) : ('paragraph' as const),
      text: normalise(element.textContent),
    }))
    .filter((block) => block.text);
}

/** DRM encrypts the chapters themselves; font obfuscation only touches fonts, which is fine. */
function isDrmProtected(files: Unzipped): boolean {
  const encryption = files['META-INF/encryption.xml'];
  if (!encryption) return false;
  return byTag(parseXml(strFromU8(encryption)), 'CipherReference').some((reference) =>
    /\.(x?html?|xml)$/i.test(reference.getAttribute('URI') ?? ''),
  );
}

function findCoverHref(opf: Document): string | null {
  const items = byTag(opf, 'item');
  const byProperty = items.find((item) =>
    (item.getAttribute('properties') ?? '').split(/\s+/).includes('cover-image'),
  );
  if (byProperty) return byProperty.getAttribute('href');

  const coverId = byTag(opf, 'meta')
    .find((meta) => meta.getAttribute('name') === 'cover')
    ?.getAttribute('content');
  const byMeta = coverId && items.find((item) => item.getAttribute('id') === coverId);
  if (byMeta) return byMeta.getAttribute('href');

  const byName = items.find(
    (item) =>
      (item.getAttribute('media-type') ?? '').startsWith('image/') &&
      /cover/i.test(`${item.getAttribute('id')} ${item.getAttribute('href')}`),
  );
  return byName?.getAttribute('href') ?? null;
}

async function importEpub(file: File): Promise<ImportedBook> {
  const bytes = new Uint8Array(await file.arrayBuffer());

  const meta = readZip(bytes, (name) => name.startsWith('META-INF/'));
  if (isDrmProtected(meta)) {
    throw new ImportError(
      'This EPUB is copy-protected, so its text cannot be read here. Use a DRM-free copy.',
    );
  }

  const container = meta['META-INF/container.xml'];
  const opfPath =
    container && byTag(parseXml(strFromU8(container)), 'rootfile')[0]?.getAttribute('full-path');
  if (!opfPath) throw new ImportError('This EPUB could not be opened. The file may be damaged.');

  const opfFile = readZip(bytes, (name) => name === opfPath)[opfPath];
  if (!opfFile) throw new ImportError('This EPUB could not be opened. The file may be damaged.');
  const opf = parseXml(strFromU8(opfFile));

  const manifest = new Map(
    byTag(opf, 'item').map((item) => [item.getAttribute('id'), item.getAttribute('href') ?? '']),
  );
  const chapterPaths = byTag(opf, 'itemref')
    .map((ref) => manifest.get(ref.getAttribute('idref')))
    .filter((href): href is string => Boolean(href))
    .map((href) => resolvePath(opfPath, href));
  const coverHref = findCoverHref(opf);
  const coverPath = coverHref ? resolvePath(opfPath, coverHref) : null;

  const wanted = new Set([...chapterPaths, ...(coverPath ? [coverPath] : [])]);
  const files = readZip(bytes, (name) => wanted.has(name));

  const blocks = chapterPaths.flatMap((path) =>
    files[path] ? documentBlocks(parseXml(strFromU8(files[path]), 'application/xhtml+xml')) : [],
  );

  const metadata = byTag(opf, 'metadata')[0] ?? opf.documentElement;
  const coverBytes = coverPath ? files[coverPath] : undefined;

  return {
    format: 'epub',
    title: normalise(byTag(metadata, 'title')[0]?.textContent) || null,
    author: normalise(byTag(metadata, 'creator')[0]?.textContent) || null,
    blocks,
    coverDataUrl: coverBytes ? await imageToCover(coverBytes).catch(() => null) : null,
  };
}

// ---- PDF ------------------------------------------------------------------------------

interface PdfLine {
  text: string;
  /** Baseline height from the bottom of the page, in PDF units. */
  y: number;
  size: number;
}

interface PdfTextItem {
  str: string;
  transform: number[];
  height: number;
  hasEOL: boolean;
}

/** The value below which `share` of the values fall (0.5 is the median). */
const quantile = (values: number[], share: number): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * share)];
};

/** Rebuilds text lines from pdf.js text runs, which can split a line into many pieces. */
function linesOf(items: PdfTextItem[]): PdfLine[] {
  const lines: PdfLine[] = [];
  let text = '';
  let y = 0;
  let size = 0;

  const flush = () => {
    const clean = normalise(text);
    if (clean) lines.push({ text: clean, y, size });
    text = '';
    size = 0;
  };

  for (const item of items) {
    const itemY = item.transform[5];
    const itemSize = item.height || Math.hypot(item.transform[2], item.transform[3]);
    if (text && Math.abs(itemY - y) > Math.max(2, itemSize * 0.5)) flush();
    if (!text) y = itemY;
    text += item.str;
    size = Math.max(size, itemSize);
    if (item.hasEOL) flush();
  }
  flush();
  return lines;
}

const isPageNumber = (text: string): boolean => /^[-–—\s]*\d{1,4}[-–—\s]*$/.test(text);
/** Running heads repeat on most pages, with only the page number changing. */
const runningHeadKey = (text: string): string => text.replace(/\d+/g, '#').toLowerCase();
const endsSentence = (text: string): boolean => /[.!?:;"”’)\]]$/.test(text);

/** Joins two lines of one paragraph, mending words that were hyphenated at the line end. */
function joinLines(previous: string, next: string): string {
  if (/[A-Za-z]-$/.test(previous) && /^[a-z]/.test(next)) return previous.slice(0, -1) + next;
  return `${previous} ${next}`;
}

/** Turns per-page lines into headings and paragraphs using spacing and font size. */
export function pdfLinesToBlocks(pages: PdfLine[][]): Block[] {
  const repeated = new Map<string, number>();
  for (const lines of pages) {
    for (const line of [lines[0], lines[lines.length - 1]]) {
      if (line)
        repeated.set(runningHeadKey(line.text), (repeated.get(runningHeadKey(line.text)) ?? 0) + 1);
    }
  }
  const isRunningHead = (line: PdfLine) =>
    pages.length >= 4 &&
    (repeated.get(runningHeadKey(line.text)) ?? 0) >= Math.max(3, pages.length * 0.3);

  const bodySize = quantile(
    pages.flat().map((line) => line.size),
    0.5,
  );
  const isHeadingSize = (line: PdfLine) => bodySize > 0 && line.size > bodySize * 1.25;
  const blocks: Block[] = [];
  let paragraph: string | null = null;

  const closeParagraph = () => {
    if (paragraph) blocks.push({ kind: 'paragraph', text: paragraph });
    paragraph = null;
  };

  for (const lines of pages) {
    const content = lines.filter((line) => !isPageNumber(line.text) && !isRunningHead(line));
    const gaps = content
      .slice(1)
      .map((line, index) => ({ previous: content[index], line }))
      .filter(({ previous, line }) => !isHeadingSize(previous) && !isHeadingSize(line))
      .map(({ previous, line }) => previous.y - line.y)
      .filter((gap) => gap > 0);
    // Most gaps are ordinary line breaks, so the lower quartile is the normal
    // spacing even on a short page with headings and paragraph breaks.
    const lineGap = quantile(gaps, 0.25) || bodySize * 1.2;

    content.forEach((line, index) => {
      const isHeadingLine = isHeadingSize(line) && line.text.length < 90;
      if (isHeadingLine) {
        closeParagraph();
        const previous = blocks[blocks.length - 1];
        // A heading set on two lines arrives as two heading lines; keep it as one.
        if (previous?.kind === 'heading' && index > 0 && isHeadingSize(content[index - 1])) {
          previous.text = `${previous.text} ${line.text}`;
        } else {
          blocks.push({ kind: 'heading', text: line.text });
        }
        return;
      }

      const gap = index > 0 ? content[index - 1].y - line.y : 0;
      const startsNew =
        paragraph === null ||
        (index > 0 && gap > lineGap * 1.45) ||
        // Across a page break, carry on only when the sentence was clearly unfinished.
        (index === 0 && endsSentence(paragraph));

      if (startsNew) {
        closeParagraph();
        paragraph = line.text;
      } else {
        paragraph = joinLines(paragraph as string, line.text);
      }
    });
  }
  closeParagraph();
  return blocks;
}

async function importPdf(
  file: File,
  onProgress?: (message: string) => void,
): Promise<ImportedBook> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;

  const loading = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  let pdf: PDFDocumentProxy;
  try {
    pdf = await loading.promise;
  } catch (error) {
    if ((error as Error)?.name === 'PasswordException') {
      throw new ImportError(
        'This PDF is password-protected. Remove the password, then upload it again.',
      );
    }
    throw new ImportError('This PDF could not be opened. The file may be damaged.');
  }

  try {
    const pages: PdfLine[][] = [];
    for (let number = 1; number <= pdf.numPages; number += 1) {
      onProgress?.(`Reading page ${number} of ${pdf.numPages}`);
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      pages.push(
        linesOf(content.items.filter((item): item is typeof item & PdfTextItem => 'str' in item)),
      );
      page.cleanup();
    }

    const blocks = pdfLinesToBlocks(pages);
    const characters = blocks.reduce((total, block) => total + block.text.length, 0);
    if (characters < MIN_PDF_TEXT_CHARS) {
      throw new ImportError(
        'This PDF has no selectable text, which usually means it is a scan. Try an EPUB or TXT copy instead.',
      );
    }

    const { info } = await pdf.getMetadata().catch(() => ({ info: {} }));
    const { Title, Author } = info as { Title?: string; Author?: string };

    return {
      format: 'pdf',
      title: normalise(Title) || null,
      author: normalise(Author) || null,
      blocks,
      coverDataUrl: await pdfCover(pdf).catch(() => null),
    };
  } finally {
    // Stops the pdf.js worker and frees the document's memory.
    void loading.destroy();
  }
}

/** Renders the first page as the book's cover. */
async function pdfCover(pdf: PDFDocumentProxy): Promise<string> {
  const page = await pdf.getPage(1);
  const natural = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: (COVER_WIDTH * 2) / natural.width });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  await page.render({ canvas, viewport }).promise;
  return canvasToCover(canvas);
}

// ---- Covers -----------------------------------------------------------------------------

async function imageToCover(bytes: Uint8Array): Promise<string> {
  const bitmap = await createImageBitmap(new Blob([bytes as BlobPart]));
  try {
    return canvasToCover(bitmap);
  } finally {
    bitmap.close();
  }
}

function canvasToCover(source: HTMLCanvasElement | ImageBitmap): string {
  const scale = Math.min(1, COVER_WIDTH / source.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  canvas.getContext('2d')?.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}
