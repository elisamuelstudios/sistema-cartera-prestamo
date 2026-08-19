import { CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { Installment, Loan, Payment, Route } from '../../core/models/models';
import { CatalogService } from '../../core/services/catalog.service';
import { LoansService } from '../../core/services/loans.service';
import { PaymentsService } from '../../core/services/payments.service';
import { ToastService } from '../../core/services/toast.service';
import { DateTimePipe } from '../../shared/date-time/date-time.pipe';
import { FilterBarComponent, FilterField } from '../../shared/filter-bar/filter-bar.component';
import { ModalComponent } from '../../shared/modal/modal.component';
import { PaymentFormComponent } from '../../shared/payment-form/payment-form.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';

type LoanClient = { code?: string; firstNames?: string; lastNames?: string; identification?: string; primaryPhone?: string; alternatePhone?: string; address?: string; city?: string; status?: string };
type LoanDetail = Loan & { client?: LoanClient; installments?: Installment[]; observations?: string | null; advisor?: string | null };

@Component({
  selector: 'app-portfolio', standalone: true,
  imports: [CurrencyPipe, DatePipe, PercentPipe, DateTimePipe, FilterBarComponent, ModalComponent, PaymentFormComponent, StatusBadgeComponent],
  template: `
 <div class="page-heading"><div><h1>Cartera</h1><p>Préstamos activos, saldos y vencimientos en tiempo real.</p></div><button class="btn btn-ghost" (click)="load()">↻ Actualizar mora</button></div>
 <section class="panel">
  <app-filter-bar [fields]="filterFields()" [values]="filters()" (changed)="onFilterChange($event)"/>
  <div class="table-wrap"><table><thead><tr><th>Préstamo</th><th>Registrado</th><th>Cliente</th><th>Fecha préstamo</th><th>Desembolso</th><th>Total + interés</th><th>Saldo</th><th>Cuotas</th><th>Mora</th><th>Ruta</th><th>Estado</th><th>Acción</th></tr></thead><tbody>
   @for(loan of loans();track loan.id){<tr><td><strong>{{loan.number}}</strong></td><td>{{loan.createdAt|appDateTime}}</td><td>{{loan.clientName}}</td><td>{{loan.loanDate|date:'dd/MM/yyyy'}}</td><td class="money">{{loan.disbursedAmount|currency:'COP':'symbol-narrow':'1.0-0'}}</td><td class="money">{{loan.totalDebt|currency:'COP':'symbol-narrow':'1.0-0'}}</td><td class="money"><strong>{{loan.outstandingPrincipal|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></td><td>{{loan.installmentProgress}}</td><td class="money" [class.text-red]="loan.overdueAmount>0">{{loan.overdueAmount|currency:'COP':'symbol-narrow':'1.0-0'}}</td><td>{{loan.route?.code||'—'}}</td><td><app-status-badge [value]="loan.status"/></td>
    <td class="action-cell"><div class="action-menu"><button type="button" class="kebab" (click)="toggleMenu(loan.id,$event)" aria-label="Acciones">⋮</button>
     @if(openMenu()===loan.id){<div class="menu-pop" (click)="$event.stopPropagation()"><button type="button" (click)="viewDetails(loan)">Ver detalles</button></div>}
    </div></td></tr>}
  </tbody></table>@if(!loans().length&&!loading()){<div class="empty">No hay préstamos con los filtros seleccionados.</div>}</div>
  <div class="pagination"><span>{{total()}} préstamos · página {{page()}}</span><div class="buttons"><button [disabled]="page()===1" (click)="go(page()-1)">Anterior</button><button [disabled]="page()*25>=total()" (click)="go(page()+1)">Siguiente</button></div></div>
 </section>

 <app-modal [open]="detailModal()" [wide]="true" title="Detalles del préstamo" (closed)="detailModal.set(false)">
  @if(detailLoading()){<div class="empty">Cargando detalles…</div>}
  @else if(detail();as loan){
   <div class="detail-heading"><div><span>Préstamo</span><strong>{{loan.number}}</strong></div>
    <div class="detail-heading-actions">
     @if(!paying()&&['Activo','En mora'].includes(loan.status)){<button type="button" class="btn btn-success" (click)="paying.set(true)">💲 Pagar</button>}
     <app-status-badge [value]="loan.status"/>
    </div>
   </div>

   @if(paying()){
    <h3 class="section-title">Registrar pago de {{loan.number}}</h3>
    <app-payment-form [loan]="{id:loan.id,number:loan.number,dailyInstallment:loan.dailyInstallment}" (saved)="onPaid(loan)" (cancelled)="paying.set(false)"/>
   }@else{

   <h3 class="section-title">Cliente</h3>
   <div class="detail-grid">
    <div><span>Código</span><strong>{{loan.client?.code||'—'}}</strong></div>
    <div><span>Nombre</span><strong>{{loan.client?.firstNames}} {{loan.client?.lastNames}}</strong></div>
    <div><span>Identificación</span><strong>{{loan.client?.identification||'—'}}</strong></div>
    <div><span>Teléfono</span><strong>{{loan.client?.primaryPhone||'—'}}</strong></div>
    <div><span>Dirección</span><strong>{{loan.client?.address||'—'}}, {{loan.client?.city||'—'}}</strong></div>
    <div><span>Ruta</span><strong>{{loan.route?.code||'—'}} · {{loan.route?.name||'—'}}</strong></div>
   </div>

   <h3 class="section-title">Préstamo</h3>
   <div class="detail-grid">
    <div><span>Fecha</span><strong>{{loan.loanDate|date:'dd/MM/yyyy'}}</strong></div>
    <div><span>Registrado</span><strong>{{loan.createdAt|appDateTime}}</strong></div>
    <div><span>Frecuencia</span><strong>{{loan.frequency}}</strong></div>
    <div><span>% interés mensual</span><strong>{{loan.interestRate|percent:'1.0-1'}}</strong></div>
    <div><span>Desembolso</span><strong>{{loan.disbursedAmount|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></div>
    <div><span>Total a cobrar</span><strong>{{loan.totalDebt|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></div>
    <div><span>Cuota</span><strong>{{loan.dailyInstallment|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></div>
    <div><span>Cuotas</span><strong>{{loan.installmentProgress}}</strong></div>
    <div><span>Saldo pendiente</span><strong>{{loan.outstandingPrincipal|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></div>
    <div><span>Mora</span><strong [class.text-red]="loan.overdueAmount>0">{{loan.overdueAmount|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></div>
    <div><span>Asesor</span><strong>{{loan.advisor||'—'}}</strong></div>
    <div><span>Observaciones</span><strong>{{loan.observations||'—'}}</strong></div>
   </div>

   <h3 class="section-title">Cronograma de cuotas</h3>
   <div class="mini-table"><table><thead><tr><th>#</th><th>Vencimiento</th><th>Valor</th><th>Pagado</th><th>Estado</th></tr></thead><tbody>
    @for(row of loan.installments;track row.id){<tr [class.text-red]="row.status==='Vencida'"><td>{{row.number}}</td><td>{{row.dueDate|date:'dd/MM/yyyy'}}</td><td class="money">{{row.amount|currency:'COP':'symbol-narrow':'1.0-0'}}</td><td class="money">{{row.paidAmount|currency:'COP':'symbol-narrow':'1.0-0'}}</td><td><app-status-badge [value]="row.status"/></td></tr>}
   </tbody></table></div>

   <h3 class="section-title">Pagos recientes</h3>
   @if(payments().length){<div class="mini-table"><table><thead><tr><th>Recibo</th><th>Fecha</th><th>Valor</th><th>Método</th></tr></thead><tbody>
    @for(p of payments();track p.id){<tr><td>{{p.receipt}}</td><td>{{p.paymentDate|date:'dd/MM/yyyy'}}</td><td class="money">{{p.amount|currency:'COP':'symbol-narrow':'1.0-0'}}</td><td>{{p.method}}</td></tr>}
   </tbody></table></div>}@else{<div class="empty small">Este préstamo todavía no registra pagos.</div>}
   }
  }
 </app-modal>`,
  styles: [`
   .toolbar select{width:165px}
   .action-cell{position:relative;text-align:center}.action-menu{position:relative;display:inline-block}
   .kebab{border:1px solid #d9e3e9;background:#fff;border-radius:8px;width:30px;height:30px;font-size:16px;line-height:1;color:#405a70;cursor:pointer}.kebab:hover{background:#f4f8fa}
   .menu-pop{position:absolute;right:0;top:calc(100% + 4px);z-index:20;background:#fff;border:1px solid #e2e9ef;border-radius:10px;box-shadow:0 12px 30px rgba(11,41,65,.14);min-width:140px;overflow:hidden}
   .menu-pop button{display:block;width:100%;text-align:left;border:0;background:#fff;padding:10px 13px;font-size:12px;font-weight:700;color:#1f425a;cursor:pointer}.menu-pop button:hover{background:#eef6f9}
   .detail-heading{display:flex;align-items:center;justify-content:space-between;padding:2px 0 16px}.detail-heading span{display:block;font-size:9px;text-transform:uppercase;color:#7a8d9d;font-weight:800}.detail-heading strong{font-size:19px;color:#10243e}.detail-heading-actions{display:flex;align-items:center;gap:12px}
   .detail-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:#dce7ed;border:1px solid #dce7ed;border-radius:12px;overflow:hidden;margin-bottom:22px}
   .detail-grid div{background:#f7fafb;padding:10px 12px}.detail-grid span{display:block;font-size:9px;color:#718697;text-transform:uppercase;font-weight:800}.detail-grid strong{font-size:12px;color:#183a52;margin-top:3px;display:block;word-break:break-word}
   .mini-table{max-height:220px;overflow:auto;border:1px solid #e2e9ef;border-radius:12px;margin-bottom:22px}.mini-table table{min-width:0;width:100%}.mini-table th,.mini-table td{padding:8px 12px;font-size:11px}
   .empty.small{padding:18px;text-align:center;color:#8192a0;font-size:12px}
   @media(max-width:900px){.detail-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
   @media(max-width:600px){.detail-grid{grid-template-columns:1fr}}
  `],
})
export class PortfolioComponent implements OnInit {
  private readonly service = inject(LoansService); private readonly paymentsService = inject(PaymentsService);
  private readonly catalog = inject(CatalogService); private readonly toast = inject(ToastService);
  private timer?: number;

  readonly loans = signal<Loan[]>([]); readonly routes = signal<Route[]>([]); readonly total = signal(0);
  readonly page = signal(1); readonly loading = signal(false); readonly openMenu = signal<string | null>(null);
  readonly detailModal = signal(false); readonly detailLoading = signal(false); readonly paying = signal(false);
  readonly detail = signal<LoanDetail | null>(null); readonly payments = signal<Payment[]>([]);

  readonly filters = signal<Record<string, string>>({ code: '', clientName: '', identification: '', status: '', routeId: '' });
  readonly filterFields = computed<FilterField[]>(() => [
    { key: 'code', label: 'Código', type: 'text', placeholder: 'PR-000001' },
    { key: 'clientName', label: 'Cliente', type: 'text', placeholder: 'Nombre del cliente' },
    { key: 'identification', label: 'Documento', type: 'text', placeholder: 'Número de documento' },
    { key: 'status', label: 'Estado', type: 'select', placeholder: 'Todos los estados', options: [{ value: 'Activo', label: 'Activo' }, { value: 'En mora', label: 'En mora' }, { value: 'Refinanciado', label: 'Refinanciado' }, { value: 'Cancelado', label: 'Cancelado' }] },
    { key: 'routeId', label: 'Ruta', type: 'select', placeholder: 'Todas las rutas', options: this.routes().map((r) => ({ value: r.id, label: `${r.code} · ${r.name}` })) },
  ]);

  ngOnInit() { this.load(); this.catalog.routes(true).subscribe((r) => this.routes.set(r)); }

  load() { this.loading.set(true); const f = this.filters(); this.service.list(this.page(), 25, { code: f['code'], clientName: f['clientName'], identification: f['identification'], status: f['status'], routeId: f['routeId'] }).subscribe({ next: (r) => { this.loans.set(r.items); this.total.set(r.total); this.loading.set(false); }, error: (e) => { this.loading.set(false); this.toast.error(e); } }); }
  go(page: number) { this.page.set(page); this.load(); }
  onFilterChange(event: { key: string; value: string }) { this.filters.update((f) => ({ ...f, [event.key]: event.value })); this.page.set(1); this.load(); }

  toggleMenu(loanId: string, event: Event) { event.stopPropagation(); this.openMenu.set(this.openMenu() === loanId ? null : loanId); }
  @HostListener('document:click') closeMenu() { this.openMenu.set(null); }

  viewDetails(loan: Loan) {
    this.openMenu.set(null); this.detailModal.set(true); this.detailLoading.set(true); this.paying.set(false); this.detail.set(null); this.payments.set([]);
    this.service.get(loan.id).subscribe({
      next: (full) => { this.detail.set(full as LoanDetail); this.detailLoading.set(false); },
      error: (e) => { this.detailLoading.set(false); this.detailModal.set(false); this.toast.error(e); },
    });
    this.paymentsService.listByLoan(loan.id).subscribe({ next: (r) => this.payments.set(r.items) });
  }

  onPaid(loan: Loan) { this.paying.set(false); this.viewDetails(loan); this.load(); }
}
