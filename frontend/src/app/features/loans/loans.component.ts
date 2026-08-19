import { CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Client, Loan, Route } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { CatalogService } from '../../core/services/catalog.service';
import { ClientsService } from '../../core/services/clients.service';
import { LoansService, LoanPreviewResult } from '../../core/services/loans.service';
import { ToastService } from '../../core/services/toast.service';
import { ClientPickerComponent } from '../../shared/client-picker/client-picker.component';
import { DateTimePipe } from '../../shared/date-time/date-time.pipe';
import { FilterBarComponent, FilterField } from '../../shared/filter-bar/filter-bar.component';
import { ModalComponent } from '../../shared/modal/modal.component';
import { MoneyInputDirective } from '../../shared/money-input/money-input.directive';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';

type LoanMode = 'new' | 'edit' | 'refinance';
type LoanPreview = LoanPreviewResult;

@Component({
  selector: 'app-loans', standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, PercentPipe, DateTimePipe, ClientPickerComponent, FilterBarComponent, ModalComponent, MoneyInputDirective, StatusBadgeComponent],
  template: `
    <div class="page-heading"><div><h1>Préstamos</h1><p>Administra desembolsos, condiciones y refinanciaciones.</p></div><div class="actions"><button class="btn btn-secondary" [disabled]="!selected()" (click)="openEdit()">Editar</button><button class="btn btn-secondary" [disabled]="!canRefinance()" (click)="openRefinance()">Refinanciar</button><button class="btn btn-primary" (click)="openNew()">＋ Nuevo préstamo</button></div></div>
    <section class="panel">
      <app-filter-bar [fields]="filterFields()" [values]="filters()" (changed)="onFilterChange($event)"/>
      <div class="table-wrap"><table><thead><tr><th>Código</th><th>Registrado</th><th>Fecha préstamo</th><th>Cliente</th><th>Desembolso</th><th>% interés</th><th>Cuotas</th><th>Total + interés</th><th>Saldo</th><th>Mora</th><th>Ruta</th><th>Estado</th></tr></thead><tbody>
        @for (loan of loans(); track loan.id) {<tr [class.selected]="selected()?.id===loan.id" (click)="selected.set(loan)" (dblclick)="openEdit()"><td><strong>{{loan.number}}</strong></td><td>{{loan.createdAt|appDateTime}}</td><td>{{loan.loanDate|date:'dd/MM/yyyy'}}</td><td>{{loan.clientName}}</td><td class="money">{{loan.disbursedAmount|currency:'COP':'symbol-narrow':'1.0-0'}}</td><td>{{loan.interestRate|percent:'1.0-1'}}</td><td><strong>{{loan.installmentProgress}}</strong></td><td class="money">{{loan.totalDebt|currency:'COP':'symbol-narrow':'1.0-0'}}</td><td class="money">{{loan.outstandingPrincipal|currency:'COP':'symbol-narrow':'1.0-0'}}</td><td class="money" [class.text-red]="loan.overdueAmount>0">{{loan.overdueAmount|currency:'COP':'symbol-narrow':'1.0-0'}}</td><td>{{loan.route?.code||'—'}}</td><td><app-status-badge [value]="loan.status"/></td></tr>}
      </tbody></table>@if (!loans().length&&!loading()) {<div class="empty">No se encontraron préstamos.</div>}</div><div class="pagination"><span>{{total()}} préstamos · página {{page()}}</span><div class="buttons"><button [disabled]="page()===1" (click)="go(page()-1)">Anterior</button><button [disabled]="page()*25>=total()" (click)="go(page()+1)">Siguiente</button></div></div>
    </section>

    <app-modal [open]="modal()" [wide]="true" [title]="modalTitle" (closed)="modal.set(false)">
      <form [formGroup]="form" class="loan-form">
        @if (mode()==='new') {
          <app-client-picker [clients]="clients()" [total]="clientTotal()" [page]="clientPage()" [search]="clientSearch()"
            [selectedId]="form.value.clientId" [loading]="clientLoading()" (searchChange)="searchClients($event)"
            (pageChange)="goClients($event)" (selected)="chooseClient($event)"/>
        } @else {<div class="locked-client"><span>Cliente del préstamo</span><strong>{{selected()?.clientName}}</strong><small>La selección está bloqueada durante {{mode()==='edit'?'la edición':'la refinanciación'}}.</small></div>}

        <h3 class="section-title">Condiciones del préstamo</h3><div class="form-grid three">
          <div class="field"><label class="required">Valor solicitado</label><input appMoneyInput type="text" inputmode="numeric" formControlName="requestedAmount" (input)="schedulePreview()"></div>
          <div class="field"><label class="required">Valor desembolsado</label><input appMoneyInput type="text" inputmode="numeric" formControlName="disbursedAmount" (input)="schedulePreview()"></div>
          <div class="field"><label class="required">Fecha</label><input type="date" formControlName="loanDate"></div>
          <div class="field"><label class="required">Número de cuotas</label><input type="number" min="1" formControlName="installmentCount" (input)="schedulePreview()"></div>
          <div class="field"><label class="required">Frecuencia</label><select formControlName="frequency"><option>Diario</option><option>Semanal</option><option>Quincenal</option><option>Mensual</option></select></div>
          <div class="field"><label class="required">Interés (% mensual)</label><input type="number" min="0" step="0.1" formControlName="interestPercent" (input)="schedulePreview()"><span class="hint">Porcentaje <strong>mensual</strong> sobre el capital, hasta 1 decimal.</span></div>
          <div class="field"><label>Cuota editable</label><input appMoneyInput type="text" inputmode="numeric" formControlName="dailyInstallment" (input)="previewFromInstallment()"><span class="hint">Al cambiarla se recalcula el interés; el número de cuotas no cambia.</span></div>
          <div class="field"><label>Ruta de cobro</label><select formControlName="routeId"><option value="">Sin asignar</option>@for (route of routes(); track route.id) {<option [value]="route.id">{{route.code}} · {{route.name}}</option>}</select></div>
          <div class="field"><label>Asesor</label><input [value]="advisorUsername" readonly><span class="hint">Usuario que registra o edita la operación.</span></div>
        </div>
        @if (preview(); as p) {<div class="loan-preview"><div><span>Capital</span><strong>{{form.value.disbursedAmount|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></div><div><span>Interés</span><strong>{{p.generatedInterest|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></div><div><span>Total a cobrar</span><strong>{{p.total|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></div><div><span>Cuota pactada</span><strong>{{p.dailyInstallment|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></div><div><span>Cantidad de pagos</span><strong>{{p.installmentCount}}</strong></div></div>}
        @if (effectiveInterestPercent < 10) {<div class="interest-warning"><strong>Interés inferior al 10 %</strong><span>El sistema lo permite, pero debes confirmar que corresponde al acuerdo realizado con el cliente.</span></div>}
        <div class="form-grid"><div class="field span-2"><label>Observaciones</label><textarea rows="2" formControlName="observations"></textarea></div></div>
      </form>
      <div modal-actions><button class="btn btn-secondary" (click)="modal.set(false)">Cancelar</button><button class="btn btn-success" [disabled]="saving()" (click)="save()">{{saving()?'Guardando…':mode()==='refinance'?'Crear refinanciación':'Guardar préstamo'}}</button></div>
    </app-modal>`,
  styles: [`
    .toolbar select{width:180px}.locked-client{display:grid;gap:4px;padding:14px 16px;border-radius:12px;background:#eef3f6;margin-bottom:20px}.locked-client span,.locked-client small{font-size:9px;color:#718697}.locked-client strong{font-size:14px;color:#183a52}.loan-preview{display:grid;grid-template-columns:repeat(5,1fr);gap:1px;background:#dce7ed;border:1px solid #dce7ed;border-radius:12px;overflow:hidden;margin:19px 0 10px}.loan-preview div{background:#f7fafb;padding:12px}.loan-preview span{display:block;font-size:9px;color:#718697;text-transform:uppercase;font-weight:800}.loan-preview strong{font-size:14px;color:#176b87;margin-top:4px;display:block}.interest-warning{display:grid;gap:3px;margin:0 0 18px;padding:11px 13px;border:1px solid #f2c66d;border-radius:10px;background:#fff8e6;color:#805716}.interest-warning strong{font-size:11px}.interest-warning span{font-size:9px}.loan-form>.section-title{margin-top:0}
    .loan-form .form-grid{align-items:start;row-gap:30px}.loan-form .field{position:relative}.loan-form .field .hint{position:absolute;top:100%;left:0;right:0;margin-top:4px}
    @media(max-width:1000px){.loan-preview{grid-template-columns:repeat(3,1fr)}}@media(max-width:750px){.loan-preview{grid-template-columns:repeat(2,1fr)}}
  `],
})
export class LoansComponent implements OnInit {
  private readonly service = inject(LoansService); private readonly clientService = inject(ClientsService);
  private readonly catalog = inject(CatalogService); private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService); private readonly fb = inject(FormBuilder);
  private searchTimer?: number; private previewTimer?: number;

  readonly loans = signal<Loan[]>([]); readonly clients = signal<Client[]>([]); readonly routes = signal<Route[]>([]);
  readonly selected = signal<Loan | null>(null); readonly total = signal(0); readonly page = signal(1);
  readonly loading = signal(false); readonly modal = signal(false);
  readonly mode = signal<LoanMode>('new'); readonly saving = signal(false); readonly preview = signal<LoanPreview | null>(null);
  readonly clientSearch = signal(''); readonly clientPage = signal(1); readonly clientTotal = signal(0); readonly clientLoading = signal(false);

  readonly codeOptions = signal<{ value: string; label: string }[]>([]);
  readonly filters = signal<Record<string, string>>({ code: '', clientName: '', identification: '', status: '', routeId: '' });
  readonly filterFields = computed<FilterField[]>(() => [
    { key: 'code', label: 'Código', type: 'select', placeholder: 'Todos los códigos', options: this.codeOptions().map((o) => ({ value: o.value, label: o.label })) },
    { key: 'clientName', label: 'Cliente', type: 'text', placeholder: 'Nombre del cliente' },
    { key: 'identification', label: 'Documento', type: 'text', placeholder: 'Número de documento' },
    { key: 'status', label: 'Estado', type: 'select', placeholder: 'Todos los estados', options: [{ value: 'Activo', label: 'Activo' }, { value: 'En mora', label: 'En mora' }, { value: 'Refinanciado', label: 'Refinanciado' }, { value: 'Cancelado', label: 'Cancelado' }] },
    { key: 'routeId', label: 'Ruta', type: 'select', placeholder: 'Todas las rutas', options: this.routes().map((r) => ({ value: r.id, label: `${r.code} · ${r.name}` })) },
  ]);

  readonly form = this.fb.group({
    clientId: ['', Validators.required], requestedAmount: [0, [Validators.required, Validators.min(1)]],
    disbursedAmount: [0, [Validators.required, Validators.min(1)]], loanDate: [new Date().toISOString().slice(0, 10), Validators.required],
    installmentCount: [32, [Validators.required, Validators.min(1)]], frequency: ['Diario', Validators.required],
    interestPercent: [28, [Validators.required, Validators.min(0)]], dailyInstallment: [0, [Validators.min(0)]],
    routeId: [''], observations: [''], interestType: ['Fijo'], administrativeFee: [0], insurance: [0],
    additionalCosts: [0], chargeMode: ['Financiados'],
  });

  ngOnInit() { this.load(); this.catalog.routes(true).subscribe((routes) => this.routes.set(routes)); this.service.codes().subscribe((c) => this.codeOptions.set(c)); }
  get modalTitle() { return this.mode() === 'new' ? 'Crear préstamo' : this.mode() === 'edit' ? 'Editar préstamo' : `Refinanciar ${this.selected()?.number ?? ''}`; }
  get advisorUsername() { return this.auth.user()?.username ?? '—'; }
  get effectiveInterestPercent() { return this.round1(Number(this.preview()?.interestRate ?? (Number(this.form.getRawValue().interestPercent) / 100)) * 100); }
  private round1(value: number) { return Math.round(value * 10) / 10; }

  load() { this.loading.set(true); const f = this.filters(); this.service.list(this.page(), 25, { code: f['code'], clientName: f['clientName'], identification: f['identification'], status: f['status'], routeId: f['routeId'] }).subscribe({ next: (result) => { this.loans.set(result.items); this.total.set(result.total); this.loading.set(false); }, error: (error) => { this.loading.set(false); this.toast.error(error); } }); }
  loadClients(search = this.clientSearch(), page = this.clientPage()) { this.clientLoading.set(true); this.clientService.list(page, 15, { status: 'Activo', q: search }).subscribe({ next: (result) => { this.clients.set(result.items); this.clientTotal.set(result.total); this.clientLoading.set(false); }, error: (error) => { this.clientLoading.set(false); this.toast.error(error); } }); }
  onFilterChange(event: { key: string; value: string }) { this.filters.update((f) => ({ ...f, [event.key]: event.value })); this.page.set(1); this.load(); }
  go(page: number) { this.page.set(page); this.load(); }
  searchClients(value: string) { this.clientSearch.set(value); clearTimeout(this.searchTimer); this.searchTimer = window.setTimeout(() => { this.clientPage.set(1); this.loadClients(); }, 250); }
  goClients(page: number) { this.clientPage.set(page); this.loadClients(); }
  chooseClient(client: Client) { this.form.patchValue({ clientId: client.id, routeId: client.routeId ?? '' }); }

  openNew() {
    this.mode.set('new'); this.selected.set(null); this.clientSearch.set(''); this.clientPage.set(1);
    this.form.reset({ clientId: '', requestedAmount: 0, disbursedAmount: 0, loanDate: new Date().toISOString().slice(0, 10), installmentCount: 32, frequency: 'Diario', interestPercent: 28, dailyInstallment: 0, routeId: '', observations: '', interestType: 'Fijo', administrativeFee: 0, insurance: 0, additionalCosts: 0, chargeMode: 'Financiados' });
    this.preview.set(null); this.loadClients(); this.modal.set(true);
  }

  openEdit() {
    const loan = this.selected(); if (!loan) return; this.mode.set('edit');
    this.service.get(loan.id).subscribe((full) => {
      this.form.patchValue({ clientId: full.clientId, requestedAmount: full.requestedAmount, disbursedAmount: full.disbursedAmount, loanDate: full.loanDate, installmentCount: full.installmentCount, frequency: full.frequency, interestPercent: this.round1(Number(full.interestRate) * 100), dailyInstallment: full.dailyInstallment, routeId: full.route?.id ?? '', observations: String(full['observations'] ?? ''), interestType: String(full['interestType'] ?? 'Fijo'), administrativeFee: Number(full['administrativeFee'] ?? 0), insurance: Number(full['insurance'] ?? 0), additionalCosts: Number(full['additionalCosts'] ?? 0), chargeMode: String(full['chargeMode'] ?? 'Financiados') });
      this.requestPreview(true); this.modal.set(true);
    });
  }

  openRefinance() {
    const loan = this.selected(); if (!loan) return; this.mode.set('refinance');
    this.form.reset({ clientId: loan.clientId, requestedAmount: loan.outstandingPrincipal, disbursedAmount: loan.outstandingPrincipal, loanDate: new Date().toISOString().slice(0, 10), installmentCount: 32, frequency: 'Diario', interestPercent: 28, dailyInstallment: 0, routeId: loan.route?.id ?? '', observations: `Refinanciación de ${loan.number}`, interestType: 'Fijo', administrativeFee: 0, insurance: 0, additionalCosts: 0, chargeMode: 'Financiados' });
    this.schedulePreview(); this.modal.set(true);
  }

  canRefinance() { return !!this.selected() && ['Activo', 'En mora'].includes(this.selected()!.status); }
  // El cálculo NO se replica en el navegador: el backend (common/finance) es la
  // única fuente de verdad, así el simulador y el préstamo guardado coinciden.
  schedulePreview() { this.debouncePreview(false); }
  previewFromInstallment() { this.debouncePreview(true); }
  private debouncePreview(useInstallment: boolean) { clearTimeout(this.previewTimer); this.previewTimer = window.setTimeout(() => this.requestPreview(useInstallment), 220); }

  private requestPreview(useInstallment: boolean) {
    const raw = this.form.getRawValue();
    if (!raw.disbursedAmount || !raw.installmentCount || Number(raw.interestPercent) < 0 || (useInstallment && !raw.dailyInstallment)) return;
    const body: Record<string, string | number> = {
      requestedAmount: Number(raw.requestedAmount) || Number(raw.disbursedAmount),
      disbursedAmount: Number(raw.disbursedAmount),
      loanDate: raw.loanDate!,
      installmentCount: Number(raw.installmentCount),
      frequency: raw.frequency!,
      // interestPercent es MENSUAL; el backend trabaja en decimal.
      interestRate: Number(raw.interestPercent) / 100,
      interestType: raw.interestType!,
      chargeMode: raw.chargeMode!,
      administrativeFee: Number(raw.administrativeFee),
      insurance: Number(raw.insurance),
      additionalCosts: Number(raw.additionalCosts),
    };
    if (useInstallment) body['dailyInstallment'] = Number(raw.dailyInstallment);
    this.service.preview(body).subscribe({
      next: (result) => {
        this.preview.set(result);
        this.form.patchValue({ interestPercent: this.round1(result.interestRate * 100), dailyInstallment: result.dailyInstallment, installmentCount: result.installmentCount }, { emitEvent: false });
      },
      error: () => this.preview.set(null),
    });
  }

  private payload() {
    const raw = this.form.getRawValue();
    return {
      clientId: raw.clientId, requestedAmount: Number(raw.requestedAmount), disbursedAmount: Number(raw.disbursedAmount),
      loanDate: raw.loanDate, installmentCount: Number(raw.installmentCount), frequency: raw.frequency,
      interestRate: Number(raw.interestPercent) / 100, ...(Number(raw.dailyInstallment) > 0 ? { dailyInstallment: Number(raw.dailyInstallment) } : {}),
      interestType: raw.interestType, administrativeFee: Number(raw.administrativeFee), insurance: Number(raw.insurance),
      additionalCosts: Number(raw.additionalCosts), routeId: raw.routeId || undefined, observations: raw.observations,
      chargeMode: raw.chargeMode,
    };
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.toast.show('Completa los campos obligatorios y verifica que el interés no sea negativo.', 'error'); return; }
    if (this.effectiveInterestPercent < 10 && !window.confirm(`El interés calculado es ${this.effectiveInterestPercent.toFixed(1)} %, inferior al 10 %. ¿Deseas guardar el préstamo con este acuerdo?`)) return;
    this.saving.set(true); const body = this.payload();
    const request = this.mode() === 'new' ? this.service.create(body) : this.mode() === 'edit' ? this.service.update(this.selected()!.id, body) : this.service.refinance(this.selected()!.id, body);
    request.subscribe({ next: (loan) => { const wasRefinance = this.mode() === 'refinance'; this.saving.set(false); this.modal.set(false); this.selected.set(loan); this.load(); this.toast.show(wasRefinance ? `Refinanciación ${loan.number} creada` : 'Préstamo guardado'); }, error: (error) => { this.saving.set(false); this.toast.error(error); } });
  }
}
