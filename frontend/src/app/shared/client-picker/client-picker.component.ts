import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Client } from '../../core/models/models';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

@Component({
  selector: 'app-client-picker',
  standalone: true,
  imports: [StatusBadgeComponent],
  template: `
    <section class="client-picker">
      <div class="picker-head">
        <div><span class="eyebrow">Cliente</span><h3>{{ title }}</h3></div>
        <div class="search"><input [value]="search" (input)="emitSearch($event)" placeholder="Código, nombre, documento, teléfono o ruta…"></div>
      </div>
      <div class="client-table">
        <table>
          <thead><tr><th>Código</th><th>Cliente</th><th>Documento</th><th>Teléfono</th><th>Ruta</th><th>Préstamo actual</th></tr></thead>
          <tbody>
            @for (client of clients; track client.id) {
              <tr [class.active]="selectedId===client.id" (click)="selected.emit(client)">
                <td><strong>{{client.code}}</strong></td><td>{{client.fullName}}</td><td>{{client.identification||'—'}}</td>
                <td>{{client.primaryPhone||'—'}}</td><td>{{client.route?.code||'—'}}</td><td><app-status-badge [value]="client.loanStatus"/></td>
              </tr>
            }
          </tbody>
        </table>
        @if (!clients.length && !loading) { <div class="empty small">{{ emptyMessage }}</div> }
      </div>
      <div class="client-pagination">
        <span>{{total}} clientes · página {{page}}</span>
        <div>
          <button type="button" [disabled]="page===1" (click)="pageChange.emit(page-1)">Anterior</button>
          <button type="button" [disabled]="page*pageSize>=total" (click)="pageChange.emit(page+1)">Siguiente</button>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .client-picker{border:1px solid #dce7ed;border-radius:13px;margin-bottom:20px;overflow:hidden}
    .picker-head{display:flex;align-items:center;gap:20px;justify-content:space-between;padding:14px 16px;background:#f6f9fa}
    .picker-head h3{margin:2px 0 0;font-size:14px}.picker-head .search{max-width:390px;width:100%}
    .eyebrow{font-size:9px;text-transform:uppercase;color:#1684a5;font-weight:900}
    .client-table{max-height:285px;overflow:auto}.client-table table{min-width:760px;width:100%}.client-table th,.client-table td{padding:9px 12px}
    .client-table tbody tr{cursor:pointer}.client-table tbody tr.active{background:#e5f5fa;box-shadow:inset 4px 0 #1882a1}.client-table .empty.small{padding:25px}
    .client-pagination{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-top:1px solid #e3ebef;font-size:10px;color:#6c8091}
    .client-pagination div{display:flex;gap:6px}.client-pagination button{border:1px solid #d9e3e9;background:#fff;border-radius:7px;padding:5px 9px;cursor:pointer}
    @media(max-width:750px){.picker-head{align-items:stretch;flex-direction:column}.picker-head .search{max-width:none}}
  `],
})
export class ClientPickerComponent {
  @Input() clients: Client[] = [];
  @Input() total = 0;
  @Input() page = 1;
  @Input() pageSize = 15;
  @Input() search = '';
  @Input() selectedId: string | null | undefined = null;
  @Input() loading = false;
  @Input() title = 'Selecciona un cliente activo';
  @Input() emptyMessage = 'No se encontraron clientes activos.';
  @Output() readonly searchChange = new EventEmitter<string>();
  @Output() readonly pageChange = new EventEmitter<number>();
  @Output() readonly selected = new EventEmitter<Client>();

  emitSearch(event: Event) { this.searchChange.emit((event.target as HTMLInputElement).value); }
}
