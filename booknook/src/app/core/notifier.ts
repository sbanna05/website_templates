import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  actionLabel?: string;
  action?: () => void;
}

const TOAST_LIFETIME_MS = 6000;

/**
 * Short confirmations shown at the bottom of the screen and read out by
 * screen readers. A toast can carry one action, which is how destructive
 * steps offer Undo instead of asking "are you sure?" first.
 */
@Injectable({ providedIn: 'root' })
export class Notifier {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  show(message: string, undo?: { label: string; run: () => void }): void {
    const toast: Toast = {
      id: this.nextId++,
      message,
      actionLabel: undo?.label,
      action: undo?.run,
    };
    this.toasts.update((toasts) => [...toasts.slice(-2), toast]);
    setTimeout(() => this.dismiss(toast.id), TOAST_LIFETIME_MS);
  }

  dismiss(id: number): void {
    this.toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  runAction(toast: Toast): void {
    toast.action?.();
    this.dismiss(toast.id);
  }
}
