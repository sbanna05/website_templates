import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { Icon } from './icon';

let nextGroup = 0;

/**
 * Five-star rating built on native radio buttons, so arrow keys, screen
 * readers and form semantics work without extra scripting.
 */
@Component({
  selector: 'app-star-rating',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <fieldset class="stars" (mouseleave)="preview.set(0)">
      <legend class="visually-hidden">{{ legend() }}</legend>
      @for (star of stars; track star) {
        <input
          class="visually-hidden"
          type="radio"
          [name]="group"
          [id]="group + '-' + star"
          [value]="star"
          [checked]="value() === star"
          (change)="rated.emit(star)"
        />
        <label
          [for]="group + '-' + star"
          [class.is-on]="star <= (preview() || value())"
          (mouseenter)="preview.set(star)"
        >
          <app-icon name="star" [size]="26" [filled]="star <= (preview() || value())" />
          <span class="visually-hidden">{{ star }} {{ star === 1 ? 'star' : 'stars' }}</span>
        </label>
      }
    </fieldset>
  `,
})
export class StarRating {
  readonly value = input(0);
  readonly legend = input('Your rating');
  readonly rated = output<number>();

  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly group = `rating-${(nextGroup += 1)}`;
  /** Star under the pointer, so hovering previews the rating before it is set. */
  protected readonly preview = signal(0);
}
