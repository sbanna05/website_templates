import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Pages that are the same for everyone are prerendered to static HTML.
 * Pages built from the reader's own saved data (their shelves, a book they
 * opened, the reader) can only be drawn in the browser.
 */
export const serverRoutes: ServerRoute[] = [
  { path: 'shelves', renderMode: RenderMode.Client },
  { path: 'book/:id', renderMode: RenderMode.Client },
  { path: 'read/:id', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Prerender },
];
