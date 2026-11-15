import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  styles: `
    a {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      color: var(--ink);
    }
  `,
  template: `
    <footer class="mt-24 border-t border-line bg-surface">
      <div class="page grid gap-10 py-12 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <p class="font-display text-2xl font-semibold">Booknook</p>
          <p class="mt-2 max-w-[44ch] text-ink-soft">
            A reading corner for your books: shelve them in 3D, read the classics page by page, and
            keep your own ratings and reviews.
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 class="font-sans text-sm font-bold tracking-normal">Explore</h2>
          <ul class="mt-1 list-none p-0">
            <li><a routerLink="/browse">Browse books</a></li>
            <li><a routerLink="/shelves">My shelves</a></li>
            <li><a routerLink="/register">Create account</a></li>
            <li><a routerLink="/login">Sign in</a></li>
          </ul>
        </nav>

        <div>
          <h2 class="font-sans text-sm font-bold tracking-normal">Where the books come from</h2>
          <ul class="mt-1 list-none p-0">
            <li>
              <a href="https://openlibrary.org" target="_blank" rel="noopener noreferrer">
                Open Library catalogue<span class="visually-hidden"> (opens in a new tab)</span>
              </a>
            </li>
            <li>
              <a href="https://www.gutenberg.org" target="_blank" rel="noopener noreferrer">
                Classic texts from Project Gutenberg<span class="visually-hidden">
                  (opens in a new tab)</span
                >
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div class="border-t border-line">
        <p class="page py-4 text-sm text-ink-soft">
          Demo build. Your shelves, reviews and account are saved in this browser only.
        </p>
      </div>
    </footer>
  `,
})
export class Footer {}
