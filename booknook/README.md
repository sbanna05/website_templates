# Booknook

A reading corner in the browser: keep your books on 3D shelves, read classics page by page with an animated page turn, and rate and review what you read.

Built mobile-first with Angular 22, Tailwind CSS 4 and GSAP.

## Run it

Angular 22 needs Node.js 22.22.3 or newer (24.15+ and 26 also work).

```bash
npm install
npm start
```

Then open <http://localhost:4200>.

| Command | What it does |
| --- | --- |
| `npm start` | Start the development server |
| `npm run build` | Build for production into `dist/` (static pages are prerendered) |
| `npm test` | Run the unit tests |
| `npm run classics` | Re-download the bundled classics into `public/library/` |

## What works

- **3D shelves.** Every book is a real box in CSS 3D. Hover or focus one and it swings out to show its cover. Create, rename and delete shelves.
- **Reader with page turns.** Six bundled classics and any `.txt` file you upload. Pages turn with a 3D flip (button, arrow keys, Page Up/Down, Space or swipe). Three typefaces, five text sizes, and your place is remembered.
- **Catalogue search.** Live search of [Open Library](https://openlibrary.org) by title or author, with covers.
- **Ratings and reviews.** Five-star rating on any book; reviews once signed in.
- **Sign in and registration.** Working forms with validation. See "Demo limits" below.
- **Three themes.** Sage and cream, slate and burgundy, ink and periwinkle. The choice is remembered.
- **Back to top.** A floating button whose ring fills as you scroll.

## Demo limits

There is no backend yet. Know these before showing it to anyone as finished:

- **Accounts are local.** Registration and sign-in store accounts in this browser's `localStorage`. Passwords are kept only as a salted SHA-256 hash, but browser storage is not secure storage. Replace `src/app/core/auth.ts` with calls to a real API before launch; its public methods (`register`, `signIn`, `signOut`, `user`) are shaped for that swap.
- **Your data is local.** Shelves, ratings, reviews and reading positions live in `localStorage`; uploaded book text lives in IndexedDB. Nothing is shared between devices or users, so reviews are only your own.
- **Only some books can be read.** Open Library supplies details and covers, not text. Reading works for the six bundled classics and for books you upload.
- **Uploads are plain text only** (`.txt`, up to 5 MB). EPUB and PDF are not supported.

## Where the books come from

- **Catalogue and covers:** the Open Library search API, called directly from the browser. Cover images are served by Open Library and its host, the Internet Archive. These are the only outside services the app contacts.
- **Bundled classics:** six public-domain texts from [Project Gutenberg](https://www.gutenberg.org), with Gutenberg's header and licence text removed by `scripts/fetch-classics.mjs`. All six authors died more than 70 years ago.
- **Fonts:** Figtree, Newsreader and Literata (SIL Open Font License), bundled with the site.

## Project layout

```text
src/
  app/
    core/      Data and state: catalogue, library, sign-in, book text, themes
    ui/        Reusable pieces: 3D shelf, cover, rating, tooltip, form field
    layout/    Header, footer, theme picker
    pages/     One file per route
  styles/      Design tokens (three themes), shared components, shelf, reader
public/library/  The bundled classics
scripts/         fetch-classics.mjs
```

Design tokens live in [src/styles/tokens.css](src/styles/tokens.css). Each theme defines the same roles (`canvas`, `surface`, `ink`, one `accent`), and Tailwind utilities such as `bg-surface` and `text-ink-soft` follow the active theme.

### Add a theme

Add a `[data-theme='name']` block to `tokens.css` with the same variables, then add the theme to `THEMES` in [src/app/core/theme.ts](src/app/core/theme.ts).

### Add a bundled classic

Add its Gutenberg id to `scripts/fetch-classics.mjs` and its details to `CLASSICS` in [src/app/core/catalog.ts](src/app/core/catalog.ts), then run `npm run classics`. Check the work is in the public domain first.
