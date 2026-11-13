import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../core/auth';
import { Notifier } from '../core/notifier';
import { FieldState, TextField, checkAll, validators } from '../ui/text-field';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TextField],
  template: `
    <div class="page grid place-items-center py-12 md:py-20">
      <div class="w-full max-w-md">
        <h1 class="text-4xl">Sign in to post reviews</h1>
        <p class="lede mt-3">New here? <a routerLink="/register">Create an account</a> first.</p>

        <form class="card mt-8 grid gap-2 p-6" novalidate (submit)="submit($event)">
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
            autocomplete="current-password"
            [state]="password"
          />
          <button type="submit" class="btn btn-primary btn-lg mt-2" [attr.aria-busy]="busy()">
            @if (busy()) {
              <span class="spinner"></span>
            }
            {{ busy() ? 'Signing in' : 'Sign in' }}
          </button>
        </form>

        <p class="mt-4 text-sm text-ink-soft">
          This is a demo without a server. Accounts exist only in this browser.
        </p>
      </div>
    </div>
  `,
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly notifier = inject(Notifier);

  private readonly emailControl = viewChild.required<TextField>('emailControl');
  private readonly passwordControl = viewChild.required<TextField>('passwordControl');

  protected readonly email = new FieldState(validators.email);
  protected readonly password = new FieldState(validators.required('Enter your password.'));
  protected readonly busy = signal(false);

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;

    const fields = [
      { state: this.email, control: this.emailControl() },
      { state: this.password, control: this.passwordControl() },
    ];
    if (!checkAll(fields)) return;

    this.busy.set(true);
    const result = await this.auth.signIn(this.email.value(), this.password.value());
    this.busy.set(false);

    if (!result.ok) {
      const rejected = result.field === 'email' ? fields[0] : fields[1];
      rejected.control.focus();
      rejected.state.reject(result.message);
      return;
    }
    this.notifier.show(`Welcome back, ${this.auth.user()?.name}`);
    void this.router.navigateByUrl('/shelves');
  }
}
