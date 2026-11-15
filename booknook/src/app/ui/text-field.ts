import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  signal,
  viewChild,
} from '@angular/core';

/**
 * State for one form field, following a forgiving validation rhythm:
 *  - nothing is flagged while the field is still being filled in;
 *  - the first blur checks it;
 *  - an error disappears the moment the person returns to fix it.
 */
export class FieldState {
  readonly value = signal('');
  readonly error = signal<string | null>(null);

  /** @param validate returns a message that says how to fix the value, or null when it is fine */
  constructor(private readonly validate: (value: string) => string | null) {}

  edit(value: string): void {
    this.value.set(value);
    this.error.set(null);
  }

  /** Runs validation and shows the result. Returns true when the value is valid. */
  check(): boolean {
    this.error.set(this.validate(this.value()));
    return this.error() === null;
  }

  /** Shows a message that came from outside the field, such as a rejected sign-in. */
  reject(message: string): void {
    this.error.set(message);
  }
}

let nextId = 0;

/** A labelled input with one slot below it that holds either the hint or the error. */
@Component({
  selector: 'app-text-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="field-label" [for]="id">{{ label() }}</label>
    <input
      #control
      class="field"
      [id]="id"
      [type]="type()"
      [value]="state().value()"
      [attr.autocomplete]="autocomplete()"
      [attr.aria-invalid]="state().error() ? 'true' : null"
      [attr.aria-describedby]="id + '-note'"
      required
      (input)="state().edit(control.value)"
      (focus)="state().error.set(null)"
      (blur)="state().check()"
    />
    <p
      class="field-note"
      [class.is-error]="state().error()"
      [id]="id + '-note'"
      [attr.role]="state().error() ? 'alert' : null"
    >
      {{ state().error() ?? hint() }}
    </p>
  `,
})
export class TextField {
  readonly state = input.required<FieldState>();
  readonly label = input.required<string>();
  readonly type = input('text');
  readonly autocomplete = input<string>();
  readonly hint = input('');

  protected readonly id = `field-${(nextId += 1)}`;
  private readonly control = viewChild.required<ElementRef<HTMLInputElement>>('control');

  focus(): void {
    this.control().nativeElement.focus();
  }
}

/**
 * Checks every field, then moves focus to the first one that needs fixing.
 * Focusing a field clears its message, so the message is put back afterwards.
 */
export function checkAll(fields: { state: FieldState; control: TextField }[]): boolean {
  const invalid = fields.filter(({ state }) => !state.check());
  const first = invalid[0];
  if (first) {
    const message = first.state.error();
    first.control.focus();
    first.state.error.set(message);
  }
  return invalid.length === 0;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validators = {
  required:
    (message: string) =>
    (value: string): string | null =>
      value.trim() ? null : message,
  email: (value: string): string | null =>
    EMAIL_PATTERN.test(value.trim()) ? null : 'Enter an email like name@example.com.',
  minLength:
    (length: number, message: string) =>
    (value: string): string | null =>
      value.length >= length ? null : message,
};
