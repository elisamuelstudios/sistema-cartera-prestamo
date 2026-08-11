import { Component, inject } from '@angular/core';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  template: `
    @if (loading.active()) {
      <div class="loading-layer" role="status" aria-live="polite" aria-label="Cargando información">
        <div class="loading-card"><span class="spinner"></span><strong>Cargando información…</strong></div>
      </div>
    }
  `,
  styles: [`
    .loading-layer{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:rgba(10,31,48,.18);backdrop-filter:blur(1.5px);animation:show .16s both}
    .loading-card{display:flex;align-items:center;gap:11px;padding:13px 17px;border-radius:13px;background:#fff;color:#173a52;box-shadow:0 14px 40px rgba(12,38,58,.22);font-size:12px}
    .spinner{width:23px;height:23px;border:3px solid #d9e7ed;border-top-color:#1684a5;border-radius:50%;animation:spin .72s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}@keyframes show{0%,65%{opacity:0}100%{opacity:1}}
  `],
})
export class LoadingOverlayComponent { readonly loading = inject(LoadingService); }

