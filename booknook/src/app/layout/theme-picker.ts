import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { THEMES, ThemeService } from '../core/theme';

/** The three colour themes as a radio group. Each option shows its two colours and its name. */
@Component({
  selector: 'app-theme-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  styles: `
    label {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 44px;
      padding: 0 12px;
      border-radius: var(--radius-control);
      font-size: 0.9375rem;
      font-weight: 600;
      cursor: pointer;
    }

    label:hover {
      background: var(--accent-wash);
    }

    input:checked + label {
      background: var(--accent-wash);
      color: var(--accent-text);
    }

    input:focus-visible + label {
      outline: 2px solid var(--accent-text);
      outline-offset: 2px;
    }

    .swatch {
      width: 22px;
      height: 22px;
      border: 1px solid var(--line-strong);
      border-radius: 50%;
    }
  `,
  template: `
    <fieldset class="m-0 border-0 p-0">
      <legend class="visually-hidden">Colour theme</legend>
      @for (option of themes; track option.id) {
        <input
          class="visually-hidden"
          type="radio"
          name="theme"
          [id]="'theme-' + option.id"
          [checked]="theme.current() === option.id"
          (change)="theme.set(option.id)"
        />
        <label [for]="'theme-' + option.id">
          <span
            class="swatch"
            [style.background]="
              'linear-gradient(135deg, ' + option.swatch[0] + ' 50%, ' + option.swatch[1] + ' 50%)'
            "
          ></span>
          {{ option.name }}
        </label>
      }
    </fieldset>
  `,
})
export class ThemePicker {
  protected readonly theme = inject(ThemeService);
  protected readonly themes = THEMES;
}
