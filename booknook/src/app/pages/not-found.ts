import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="page py-24">
      <h1 class="text-4xl md:text-5xl">This page is not on any shelf</h1>
      <p class="lede mt-4 max-w-[52ch]">
        The address may be mistyped, or the page may have moved. Your books are where you left them.
      </p>
      <div class="mt-8 flex flex-wrap gap-3">
        <a class="btn btn-primary" routerLink="/">Go to the home page</a>
        <a class="btn" routerLink="/shelves">Open my shelves</a>
      </div>
    </div>
  `,
})
export class NotFound {}
