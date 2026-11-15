import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Library } from '../core/library';
import { Book } from '../core/models';
import { Notifier } from '../core/notifier';
import { BookCover } from './book-cover';
import { Icon } from './icon';

/** A book in a grid: cover, title, author and one quick action. */
@Component({
  selector: 'app-book-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BookCover, Icon],
  host: { class: 'card flex flex-col gap-3' },
  template: `
    <a [routerLink]="['/book', book().id]" class="block" tabindex="-1" aria-hidden="true">
      <app-book-cover [book]="book()" decorative />
    </a>
    <div class="flex min-w-0 flex-1 flex-col">
      <h3 class="font-sans text-[0.9375rem] font-bold leading-snug tracking-normal">
        <a [routerLink]="['/book', book().id]" class="line-clamp-2 text-ink no-underline">
          {{ book().title }}
        </a>
      </h3>
      <p class="num mt-1 line-clamp-1 text-sm text-ink-soft">{{ byline() }}</p>
    </div>

    @if (shelfName(); as name) {
      <p class="flex min-h-11 items-center gap-2 text-sm font-semibold text-accent-text">
        <app-icon name="check" [size]="18" />
        <span class="truncate">On {{ name }}</span>
      </p>
    } @else {
      <button type="button" class="btn w-full" (click)="add()">
        <app-icon name="plus" [size]="18" />
        Add to shelf
        <span class="visually-hidden">: {{ book().title }}</span>
      </button>
    }
  `,
})
export class BookCard {
  readonly book = input.required<Book>();

  private readonly library = inject(Library);
  private readonly notifier = inject(Notifier);

  /** "Author, year", built here so no template whitespace lands before the comma. */
  protected readonly byline = computed(() => {
    const { author, year } = this.book();
    return year ? `${author}, ${year}` : author;
  });

  protected readonly shelfName = computed(
    () => this.library.shelvesHolding(this.book().id)[0]?.name ?? null,
  );

  /** Quick add goes to "Want to read" (or the first shelf if that one was deleted). */
  protected add(): void {
    const shelves = this.library.state().shelves;
    const shelf = shelves.find((candidate) => candidate.id === 'want') ?? shelves[0];
    if (!shelf) {
      this.notifier.show('Create a shelf first, on the My shelves page.');
      return;
    }
    const before = this.library.state();
    this.library.addToShelf(shelf.id, this.book());
    this.notifier.show(`Added to ${shelf.name}`, {
      label: 'Undo',
      run: () => this.library.restoreSnapshot(before),
    });
  }
}
