import { DOCUMENT } from '@angular/common';
import { Injectable, afterNextRender, inject, signal } from '@angular/core';
import { BrowserStorage } from './browser-storage';

export const THEMES = [
  { id: 'sage', name: 'Sage and cream', swatch: ['#f3eee2', '#4a6650'] },
  { id: 'burgundy', name: 'Slate and burgundy', swatch: ['#232528', '#8f2d45'] },
  { id: 'periwinkle', name: 'Ink and periwinkle', swatch: ['#0f1016', '#99a4ff'] },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

const isThemeId = (value: unknown): value is ThemeId => THEMES.some((theme) => theme.id === value);

/**
 * The active colour theme. The saved choice is also applied by a tiny inline
 * script in index.html before first paint, so the page never flashes the
 * default theme; this service picks the same value up after hydration.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storage = inject(BrowserStorage);
  private readonly document = inject(DOCUMENT);

  readonly current = signal<ThemeId>('sage');

  constructor() {
    afterNextRender(() => {
      // The inline script in index.html has already applied the saved theme to <html>.
      const saved = this.document.documentElement.dataset['theme'];
      if (isThemeId(saved)) this.current.set(saved);
    });
  }

  set(theme: ThemeId): void {
    this.current.set(theme);
    this.document.documentElement.dataset['theme'] = theme;
    this.storage.write('theme', theme);
  }
}
