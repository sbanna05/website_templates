import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  signal,
} from '@angular/core';
import { Book, clothFor } from '../core/models';

/**
 * A book's cover. Shows the catalogue artwork when there is some, and a
 * typeset cover (title and author on coloured cloth) when there is none or
 * the image fails to load, so a cover slot is never empty.
 */
@Component({
  selector: 'app-book-cover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'cover', '[style.--cloth]': 'cloth()' },
  template: `
    <span class="cover-type" aria-hidden="true">
      <span class="cover-type-title">{{ book().title }}</span>
      <span class="cover-type-author">{{ book().author }}</span>
    </span>
    @if (book().coverUrl && !failed()) {
      <img
        [src]="book().coverUrl"
        [alt]="decorative() ? '' : 'Cover of ' + book().title + ' by ' + book().author"
        loading="lazy"
        width="180"
        height="270"
        (error)="failed.set(true)"
      />
    } @else if (!decorative()) {
      <span class="visually-hidden">Cover of {{ book().title }} by {{ book().author }}</span>
    }
  `,
})
export class BookCover {
  readonly book = input.required<Book>();
  /** Set when the title is already announced right beside the cover. */
  readonly decorative = input(false, { transform: booleanAttribute });
  protected readonly failed = signal(false);
  protected readonly cloth = computed(() => clothFor(this.book().id));
}
