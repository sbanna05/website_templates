import { create } from 'zustand';
import { createId } from '../lib/id';

export type ToastTone = 'info' | 'success' | 'error';

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, tone?: ToastTone) => void;
  dismiss: (id: string) => void;
}

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, tone = 'info') => {
    const id = createId('toast');
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, message, tone }] }));
    setTimeout(() => get().dismiss(id), tone === 'error' ? 6000 : 3200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (message: string, tone?: ToastTone): void => useToasts.getState().push(message, tone);
