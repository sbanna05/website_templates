import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../core/auth';
import { Notifier } from '../core/notifier';
import { Icon } from '../ui/icon';
import { Tooltip } from '../ui/tooltip';
import { ThemePicker } from './theme-picker';

type Panel = 'menu' | 'theme' | null;

/**
 * Site header. On wide screens the links sit in the bar; on a phone they
 * move into a panel behind the menu button. The theme picker is a small
 * panel on both.
 */
@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, Icon, Tooltip, ThemePicker],
  host: {
    '(document:keydown.escape)': 'close(true)',
    '(document:click)': 'onDocumentClick($event)',
  },
  styles: `
    .nav-link {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      padding: 0 12px;
      border-radius: var(--radius-control);
      color: var(--ink);
      font-weight: 600;
      text-decoration: none;
    }

    .nav-link:hover {
      background: var(--accent-wash);
    }

    .nav-link.is-current {
      color: var(--accent-text);
      box-shadow: inset 0 -2px 0 var(--accent-text);
      border-radius: 0;
    }

    .panel {
      position: absolute;
      top: calc(100% + 8px);
      right: var(--page-gutter);
      z-index: 50;
      width: min(280px, calc(100vw - 2 * var(--page-gutter)));
      padding: 8px;
      border: 1px solid var(--line-strong);
      border-radius: var(--radius-card);
      background: var(--surface);
      box-shadow: 0 16px 32px rgb(0 0 0 / 0.22);
    }

    .panel .nav-link {
      display: flex;
    }

    .panel .nav-link.is-current {
      border-radius: var(--radius-control);
      background: var(--accent-wash);
      box-shadow: none;
    }

    .panel hr {
      margin: 8px 0;
      border: 0;
      border-top: 1px solid var(--line);
    }
  `,
  template: `
    <header
      class="sticky top-0 z-40 border-b border-line bg-canvas"
      [style.height]="'var(--header-height)'"
    >
      <div class="page relative flex h-full items-center gap-2">
        <a routerLink="/" class="mr-auto flex items-center gap-2 text-ink no-underline">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
            <rect x="5" y="4" width="6" height="24" rx="1.5" fill="var(--accent)" />
            <rect x="13" y="8" width="6" height="20" rx="1.5" fill="var(--ink)" />
            <rect
              x="21.2"
              y="5.5"
              width="6"
              height="23"
              rx="1.5"
              fill="var(--accent-text)"
              transform="rotate(12 24 17)"
            />
          </svg>
          <span class="font-display text-[1.375rem] font-semibold tracking-tight">Booknook</span>
        </a>

        <nav class="hidden md:flex" aria-label="Main">
          @for (link of links; track link.path) {
            <a
              class="nav-link"
              [routerLink]="link.path"
              routerLinkActive="is-current"
              ariaCurrentWhenActive="page"
            >
              {{ link.label }}
            </a>
          }
        </nav>

        <button
          #themeButton
          type="button"
          class="icon-btn"
          aria-label="Change colour theme"
          appTooltip="Change colour theme"
          aria-controls="theme-panel"
          [attr.aria-expanded]="open() === 'theme'"
          (click)="toggle('theme')"
        >
          <app-icon name="palette" />
        </button>

        <div class="hidden items-center gap-2 md:flex">
          @if (auth.user(); as user) {
            <span class="max-w-40 truncate text-sm font-semibold text-ink-soft">{{
              user.name
            }}</span>
            <button type="button" class="btn" (click)="signOut()">Sign out</button>
          } @else {
            <a class="btn btn-quiet" routerLink="/login">Sign in</a>
            <a class="btn btn-primary" routerLink="/register">Create account</a>
          }
        </div>

        <button
          #menuButton
          type="button"
          class="icon-btn md:hidden"
          aria-controls="menu-panel"
          [attr.aria-label]="open() === 'menu' ? 'Close menu' : 'Open menu'"
          [attr.aria-expanded]="open() === 'menu'"
          (click)="toggle('menu')"
        >
          <app-icon [name]="open() === 'menu' ? 'close' : 'menu'" />
        </button>

        @if (open() === 'theme') {
          <div id="theme-panel" class="panel">
            <app-theme-picker />
          </div>
        }

        @if (open() === 'menu') {
          <div id="menu-panel" class="panel md:hidden">
            <nav aria-label="Main">
              @for (link of links; track link.path) {
                <a
                  class="nav-link"
                  [routerLink]="link.path"
                  routerLinkActive="is-current"
                  ariaCurrentWhenActive="page"
                  (click)="close()"
                >
                  {{ link.label }}
                </a>
              }
            </nav>
            <hr />
            @if (auth.user(); as user) {
              <p class="px-3 py-2 text-sm text-ink-soft">Signed in as {{ user.name }}</p>
              <button type="button" class="btn w-full" (click)="signOut()">Sign out</button>
            } @else {
              <div class="grid gap-2">
                <a class="btn btn-primary" routerLink="/register" (click)="close()">
                  Create account
                </a>
                <a class="btn" routerLink="/login" (click)="close()">Sign in</a>
              </div>
            }
          </div>
        }
      </div>
    </header>
  `,
})
export class Header {
  protected readonly auth = inject(Auth);
  private readonly notifier = inject(Notifier);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly themeButton = viewChild.required<ElementRef<HTMLElement>>('themeButton');
  private readonly menuButton = viewChild.required<ElementRef<HTMLElement>>('menuButton');

  protected readonly links = [
    { path: '/browse', label: 'Browse' },
    { path: '/shelves', label: 'My shelves' },
  ];
  protected readonly open = signal<Panel>(null);

  protected toggle(panel: Exclude<Panel, null>): void {
    this.open.update((current) => (current === panel ? null : panel));
  }

  /** Closes any open panel. After Escape, focus returns to the button that opened it. */
  protected close(restoreFocus = false): void {
    const panel = this.open();
    if (!panel) return;
    this.open.set(null);
    if (restoreFocus) {
      (panel === 'theme' ? this.themeButton() : this.menuButton()).nativeElement.focus();
    }
  }

  protected onDocumentClick(event: Event): void {
    if (!this.host.contains(event.target as Node)) this.close();
  }

  protected signOut(): void {
    this.auth.signOut();
    this.close();
    this.notifier.show('Signed out');
    void this.router.navigateByUrl('/');
  }
}
