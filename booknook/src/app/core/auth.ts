import { Injectable, afterNextRender, computed, inject, signal } from '@angular/core';
import { BrowserStorage } from './browser-storage';

/**
 * Demo sign-in. There is no server yet: accounts are kept in this browser's
 * localStorage, which is NOT secure storage and must be replaced by a real
 * backend before launch. Passwords are still never stored as typed; only a
 * salted SHA-256 hash is kept, so nothing readable sits on disk.
 *
 * The public surface (`register`, `signIn`, `signOut`, `user`) is what a real
 * API client would expose, so swapping the implementation should not touch
 * the pages.
 */

interface Account {
  name: string;
  email: string;
  salt: string;
  passwordHash: string;
}

export interface SessionUser {
  name: string;
  email: string;
}

export type AuthResult = { ok: true } | { ok: false; field: 'email' | 'password'; message: string };

async function hashPassword(password: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

const normalise = (email: string): string => email.trim().toLowerCase();

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly storage = inject(BrowserStorage);

  readonly user = signal<SessionUser | null>(null);
  readonly isSignedIn = computed(() => this.user() !== null);

  constructor() {
    // Restored after hydration so the server-rendered and first client render match.
    afterNextRender(() => this.user.set(this.storage.read<SessionUser | null>('session', null)));
  }

  async register(name: string, email: string, password: string): Promise<AuthResult> {
    const accounts = this.storage.read<Account[]>('accounts', []);
    if (accounts.some((account) => account.email === normalise(email))) {
      return {
        ok: false,
        field: 'email',
        message: 'An account with this email already exists. Sign in instead.',
      };
    }

    const salt = crypto.randomUUID();
    const account: Account = {
      name: name.trim(),
      email: normalise(email),
      salt,
      passwordHash: await hashPassword(password, salt),
    };
    this.storage.write('accounts', [...accounts, account]);
    this.startSession(account);
    return { ok: true };
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    const account = this.storage
      .read<Account[]>('accounts', [])
      .find((candidate) => candidate.email === normalise(email));
    if (!account) {
      return {
        ok: false,
        field: 'email',
        message: 'No account uses this email in this browser. Create one first.',
      };
    }
    if ((await hashPassword(password, account.salt)) !== account.passwordHash) {
      return { ok: false, field: 'password', message: 'That password does not match. Try again.' };
    }
    this.startSession(account);
    return { ok: true };
  }

  signOut(): void {
    this.user.set(null);
    this.storage.remove('session');
  }

  private startSession(account: Account): void {
    const user = { name: account.name, email: account.email };
    this.user.set(user);
    this.storage.write('session', user);
  }
}
