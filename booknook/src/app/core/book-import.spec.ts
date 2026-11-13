import { strToU8, zipSync } from 'fflate';
import { ImportError, formatOf, importBook, pdfLinesToBlocks } from './book-import';

const OPF = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>The Lighthouse Keeper</dc:title>
    <dc:creator>Mara Holt</dc:creator>
  </metadata>
  <manifest>
    <item id="one" href="text/one.xhtml" media-type="application/xhtml+xml"/>
    <item id="two" href="text/two%20part.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="one"/>
    <itemref idref="two"/>
  </spine>
</package>`;

const chapter = (body: string) =>
  `<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><body>${body}</body></html>`;

function epubFile(files: Record<string, string>): File {
  const zip = zipSync(
    Object.fromEntries(Object.entries(files).map(([name, text]) => [name, strToU8(text)])),
  );
  return new File([zip as BlobPart], 'lighthouse.epub', { type: 'application/epub+zip' });
}

const CONTAINER = `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`;

describe('formatOf', () => {
  it('recognises files by extension or type', () => {
    expect(formatOf(new File([], 'a.EPUB'))).toBe('epub');
    expect(formatOf(new File([], 'scan', { type: 'application/pdf' }))).toBe('pdf');
    expect(formatOf(new File([], 'notes.txt'))).toBe('txt');
    expect(formatOf(new File([], 'novel.docx'))).toBeNull();
  });
});

describe('importBook with an EPUB', () => {
  it('reads the title, author and chapters in spine order', async () => {
    const book = await importBook(
      epubFile({
        'META-INF/container.xml': CONTAINER,
        'OEBPS/content.opf': OPF,
        'OEBPS/text/one.xhtml': chapter('<h1>One</h1><p>The lamp was   lit.</p>'),
        'OEBPS/text/two part.xhtml': chapter('<h2>Two</h2><ul><li><p>Fog came in.</p></li></ul>'),
      }),
    );

    expect(book.title).toBe('The Lighthouse Keeper');
    expect(book.author).toBe('Mara Holt');
    expect(book.blocks).toEqual([
      { kind: 'heading', text: 'One' },
      { kind: 'paragraph', text: 'The lamp was lit.' },
      { kind: 'heading', text: 'Two' },
      { kind: 'paragraph', text: 'Fog came in.' },
    ]);
  });

  it('refuses a copy-protected EPUB with a clear message', async () => {
    const file = epubFile({
      'META-INF/container.xml': CONTAINER,
      'META-INF/encryption.xml':
        '<encryption><EncryptedData><CipherData><CipherReference URI="OEBPS/text/one.xhtml"/></CipherData></EncryptedData></encryption>',
      'OEBPS/content.opf': OPF,
    });

    await expect(importBook(file)).rejects.toThrow(/copy-protected/);
  });

  it('rejects a file that is not a zip', async () => {
    const file = new File(['not a zip'], 'broken.epub');

    await expect(importBook(file)).rejects.toBeInstanceOf(ImportError);
  });
});

describe('pdfLinesToBlocks', () => {
  const line = (text: string, y: number, size = 10) => ({ text, y, size });

  it('joins lines into paragraphs, splits on wide gaps and mends hyphenation', () => {
    const blocks = pdfLinesToBlocks([
      [
        line('Chapter One', 700, 18),
        line('The night was cold and the sea was rest-', 660),
        line('less under the moon.', 648),
        line('Morning came.', 620),
      ],
    ]);

    expect(blocks).toEqual([
      { kind: 'heading', text: 'Chapter One' },
      { kind: 'paragraph', text: 'The night was cold and the sea was restless under the moon.' },
      { kind: 'paragraph', text: 'Morning came.' },
    ]);
  });

  it('continues an unfinished sentence across a page break and drops page numbers', () => {
    const blocks = pdfLinesToBlocks([
      [line('She opened the door and', 700), line('12', 40)],
      [line('stepped outside.', 700), line('13', 40)],
    ]);

    expect(blocks).toEqual([
      { kind: 'paragraph', text: 'She opened the door and stepped outside.' },
    ]);
  });
});
