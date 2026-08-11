import { Injectable, signal } from '@angular/core';

export interface Toast { id: number; message: string; type: 'success' | 'error' | 'info'; }
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  show(message: string, type: Toast['type'] = 'success') {
    const id = Date.now(); this.toasts.update((items) => [...items, { id, message, type }]);
    window.setTimeout(() => this.dismiss(id), 4200);
  }
  dismiss(id: number) { this.toasts.update((items) => items.filter((item) => item.id !== id)); }
  error(error: unknown, fallback = 'No fue posible completar la operación') {
    const response = error as { error?: { message?: string | string[] } }; const message = response?.error?.message;
    this.show(Array.isArray(message) ? message.join('. ') : message || fallback, 'error');
  }
}

