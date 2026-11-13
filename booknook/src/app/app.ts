import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Footer } from './layout/footer';
import { Header } from './layout/header';
import { BackToTop } from './ui/back-to-top';
import { ToastOutlet } from './ui/toast-outlet';

/**
 * App shell: skip link, header, the routed page, footer and the floating
 * helpers. The reader is immersive, so the site chrome steps aside there.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Header, Footer, BackToTop, ToastOutlet],
  template: `
    <a class="skip-link" href="#main">Skip to content</a>
    @if (!immersive()) {
      <app-header />
    }
    <main id="main" tabindex="-1" class="outline-none">
      <router-outlet />
    </main>
    @if (!immersive()) {
      <app-footer />
      <app-back-to-top />
    }
    <app-toast-outlet />
  `,
})
export class App {
  private readonly router = inject(Router);

  protected readonly immersive = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.startsWith('/read/')),
    ),
    { initialValue: false },
  );
}
