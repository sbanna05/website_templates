// Downloads the public-domain classics that ship with Booknook and strips
// the Project Gutenberg header and licence footer, leaving only the work's
// own text. Run with `npm run classics` to refresh public/library/.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CLASSICS = [
  { slug: 'alice', gutenbergId: 11 },
  { slug: 'jekyll-hyde', gutenbergId: 43 },
  { slug: 'time-machine', gutenbergId: 35 },
  { slug: 'christmas-carol', gutenbergId: 46 },
  { slug: 'yellow-wallpaper', gutenbergId: 1952 },
  { slug: 'call-of-the-wild', gutenbergId: 215 },
];

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/library');
await mkdir(outDir, { recursive: true });

for (const { slug, gutenbergId } of CLASSICS) {
  const url = `https://www.gutenberg.org/cache/epub/${gutenbergId}/pg${gutenbergId}.txt`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  const raw = (await response.text()).replace(/\r\n/g, '\n').replace(/^﻿/, '');

  const start = raw.match(/\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*\n/);
  const end = raw.match(/\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG EBOOK/);
  if (!start || !end) throw new Error(`Could not find the text boundaries in ${slug}`);

  const body = raw.slice(start.index + start[0].length, end.index).trim();
  await writeFile(path.join(outDir, `${slug}.txt`), `${body}\n`, 'utf8');
  console.log(`${slug}: ${Math.round(body.length / 1024)} kB`);
}
