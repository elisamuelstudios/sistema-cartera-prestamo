import { Component, Input } from '@angular/core';

@Component({ selector: 'app-status-badge', standalone: true, template: '<span class="badge" [attr.data-tone]="tone">{{ value }}</span>', styles: [`
  .badge{display:inline-flex;align-items:center;white-space:nowrap;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:800;letter-spacing:.02em;background:#edf2f7;color:#526577}
  [data-tone=green]{background:#e6f6ed;color:#16854d}[data-tone=red]{background:#fdebec;color:#c83945}[data-tone=orange]{background:#fff1dc;color:#b86508}[data-tone=blue]{background:#e6f4fa;color:#176b87}[data-tone=gray]{background:#edf2f7;color:#526577}
` ] })
export class StatusBadgeComponent {
  @Input() value = '';
  get tone() { const value = this.value.toLowerCase(); if (value.includes('mora') || value.includes('negra') || value.includes('venc')) return 'red'; if (value.includes('activo') || value.includes('pag') || value.includes('cancel')) return 'green'; if (value.includes('sin préstamo') || value.includes('pendiente')) return 'orange'; if (value.includes('refin')) return 'blue'; return 'gray'; }
}

