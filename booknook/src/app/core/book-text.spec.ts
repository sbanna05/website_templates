import { parseBook } from './book-text';

describe('parseBook', () => {
  it('joins hard-wrapped lines into one paragraph', () => {
    const { sections } = parseBook('It was a dark\nand stormy night.\n\nThe rain fell.');

    expect(sections[0].blocks).toEqual([
      { kind: 'paragraph', text: 'It was a dark and stormy night.' },
      { kind: 'paragraph', text: 'The rain fell.' },
    ]);
  });

  it('recognises chapter lines and short capitalised lines as headings', () => {
    const { sections } = parseBook(
      'CHAPTER I.\nDown the Rabbit-Hole\n\nAlice was tired.\n\nSTORY OF THE DOOR',
    );
    const kinds = sections.flatMap((section) => section.blocks.map((block) => block.kind));

    expect(kinds).toEqual(['heading', 'paragraph', 'heading']);
  });

  it('drops transcriber markers that are not part of the work', () => {
    const { sections } = parseBook('[Illustration]\n\ncover\n\nOnce upon a time.');

    expect(sections[0].blocks.map((block) => block.text)).toEqual(['Once upon a time.']);
  });

  it('splits a long book into sections whose offsets add up to its length', () => {
    const paragraph = 'word '.repeat(400).trim();
    const book = parseBook(Array.from({ length: 30 }, () => paragraph).join('\n\n'));

    expect(book.sections.length).toBeGreaterThan(1);
    const last = book.sections[book.sections.length - 1];
    expect(last.offset + last.length).toBe(book.length);
  });

  it('returns no sections for an empty file', () => {
    expect(parseBook('  \n\n ').sections).toEqual([]);
  });
});
