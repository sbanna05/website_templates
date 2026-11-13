import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../core/auth';
import { Notifier } from '../core/notifier';
import { FieldState, TextField, checkAll, validators } from '../ui/text-field';

const MIN_PASSWORD_LENGTH = 8;

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TextField],
  template: `
    <div class="page grid place-items-center py-12 md:py-20">
      <div class="w-full max-w-md">
        <h1 class="text-4xl">Create your Booknook account</h1>
        <p class="lede mt-3">Already have one? <a routerLink="/login">Sign in</a> instead.</p>

        <form class="card mt-8 grid gap-2 p-6" novalidate (submit)="submit($event)">
          <app-text-field
            #nameControl
            label="Name"
            autocomplete="name"
            hint="Shown beside your reviews."
            [state]="name"
          />
          <app-text-field
            #emailControl
            label="Email"
            type="email"
            autocomplete="email"
            [state]="email"
          />
          <app-text-field
            #passwordControl
            label="Password"
            type="password"
            autocomplete="new-password"
            hint="At least 8 characters."
            [state]="password"
          />
          <button type="submit" class="btn btn-primary btn-lg mt-2" [attr.aria-busy]="busy()">
            @if (busy()) {
              <span class="spinner"></span>
            }
            {{ busy() ? 'Creating account' : 'Create account' }}
          </button>
        </form>

        <p class="mt-4 text-sm text-ink-soft">
          This is a demo without a server. Your account is saved only in this browser, so use a
          password you do not use anywhere else.
        </p>
      </div>
    </div>
  `,
})
export class Register {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly notifier = inject(Notifier);

  private readonly nameControl = viewChild.required<TextField>('nameControl');
  private readonly emailControl = viewChild.required<TextField>('emailControl');
  private readonly passwordControl = viewChild.required<TextField>('passwordControl');

  protected readonly name = new FieldState(
    validators.required('Enter the name to show on reviews.'),
  );
  protected readonly email = new FieldState(validators.email);
  protected readonly password = new FieldState(
    validators.minLength(MIN_PASSWORD_LENGTH, 'Use at least 8 characters.'),
  );
  protected readonly busy = signal(false);

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;

    const emailField = { state: this.email, control: this.emailControl() };
    const fields = [
      { state: this.name, control: this.nameControl() },
      emailField,
      { state: this.password, control: this.passwordControl() },
    ];
    if (!checkAll(fields)) return;

    this.busy.set(true);
    const result = await this.auth.register(
      this.name.value(),
      this.email.value(),
      this.password.value(),
    );
    this.busy.set(false);

    if (!result.ok) {
      emailField.control.focus();
      emailField.state.reject(result.message);
      return;
    }
    this.notifier.show(`Welcome, ${this.auth.user()?.name}. Your account is ready.`);
    void this.router.navigateByUrl('/shelves');
  }
}
