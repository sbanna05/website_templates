import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

/**
 * localStorage that is safe to call during server rendering and in browsers
 * that block storage (private mode, full quota). Every key Booknook uses is
 * listed in `STORAGE_KEYS` so nothing is stored that the app cannot account for.
 */
export const STORAGE_KEYS = {
  library: 'booknook.library.v1',
  accounts: 'booknook.accounts.v1',
  session: 'booknook.session.v1',
  theme: 'booknook.theme',
  reader: 'booknook.reader.v1',
} as const;

export type StorageKey = keyof typeof STORAGE_KEYS;

@Injectable({ providedIn: 'root' })
export class BrowserStorage {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  read<T>(key: StorageKey, fallback: T): T {
    if (!this.isBrowser) return fallback;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS[key]);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  }

  /** Returns false when the browser refuses the write. */
  write(key: StorageKey, value: unknown): boolean {
    if (!this.isBrowser) return false;
    try {
      localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  remove(key: StorageKey): void {
    if (!this.isBrowser) return;
    try {
      localStorage.removeItem(STORAGE_KEYS[key]);
    } catch {
      // Storage is unavailable, so there is nothing to remove.
    }
  }
}
