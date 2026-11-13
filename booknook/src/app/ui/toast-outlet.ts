import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Notifier } from '../core/notifier';

/** Renders the Notifier's toasts. The live region announces each one to screen readers. */
@Component({
  selector: 'app-toast-outlet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-stack" role="status" aria-live="polite">
      @for (toast of notifier.toasts(); track toast.id) {
        <div class="toast">
          <span>{{ toast.message }}</span>
          @if (toast.actionLabel) {
            <button type="button" (click)="notifier.runAction(toast)">
              {{ toast.actionLabel }}
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class ToastOutlet {
  protected readonly notifier = inject(Notifier);
}
