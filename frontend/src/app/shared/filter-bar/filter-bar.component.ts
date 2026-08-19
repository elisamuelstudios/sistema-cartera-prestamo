import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface FilterOption { value: string; label: string; }
export interface FilterField { key: string; label: string; type: 'text' | 'select'; placeholder?: string; options?: FilterOption[]; }

/**
 * Barra de filtros config-driven: cada campo se muestra en su propia casilla
 * etiquetada y envuelve en filas (no estira un buscador a todo el ancho).
 * Los `text` se emiten con debounce; los `select`, de inmediato.
 */
@Component({
  selector: 'app-filter-bar', standalone: true,
  template: `
    <div class="filter-bar">
      @for (field of fields; track field.key) {
        <div class="filter-field">
          <label>{{ field.label }}</label>
          @if (field.type === 'select') {
            <select [value]="values[field.key] || ''" (change)="onSelect(field.key, $event)">
              <option value="">{{ field.placeholder || 'Todos' }}</option>
              @for (opt of field.options; track opt.value) { <option [value]="opt.value">{{ opt.label }}</option> }
            </select>
          } @else {
            <input type="text" [value]="values[field.key] || ''" [placeholder]="field.placeholder || ''" (input)="onText(field.key, $event)">
          }
        </div>
      }
    </div>`,
  styles: [`
    .filter-bar{display:flex;flex-wrap:wrap;align-items:end;gap:12px 14px;padding:16px 18px;border-bottom:1px solid #e8eef2}
    .filter-field{display:grid;gap:5px;flex:1 1 160px;min-width:150px;max-width:230px}
    .filter-field label{font-size:9px;text-transform:uppercase;letter-spacing:.05em;font-weight:800;color:#7a8d9d}
    .filter-field input,.filter-field select{margin:0}
    @media(max-width:640px){.filter-field{flex:1 1 100%;max-width:none}}
  `],
})
export class FilterBarComponent {
  @Input() fields: FilterField[] = [];
  @Input() values: Record<string, string> = {};
  @Output() changed = new EventEmitter<{ key: string; value: string }>();
  private readonly timers: Record<string, number> = {};

  onSelect(key: string, event: Event) { this.changed.emit({ key, value: (event.target as HTMLSelectElement).value }); }
  onText(key: string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    window.clearTimeout(this.timers[key]);
    this.timers[key] = window.setTimeout(() => this.changed.emit({ key, value }), 300);
  }
}
