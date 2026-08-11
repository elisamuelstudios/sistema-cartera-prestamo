import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Client, Loan, Route } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { CatalogService } from '../../core/services/catalog.service';
import { ClientsService } from '../../core/services/clients.service';
import { LoansService } from '../../core/services/loans.service';
import { ToastService } from '../../core/services/toast.service';
import { ClientPickerComponent } from '../../shared/client-picker/client-picker.component';
import { DateTimePipe } from '../../shared/date-time/date-time.pipe';
import { ModalComponent } from '../../shared/modal/modal.component';
import { MoneyInputDirective } from '../../shared/money-input/money-input.directive';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';

type LoanMode = 'new' | 'edit' | 'refinance';
interface LoanPreview { interestRate: number; generatedInterest: number; total: number; dailyInstallment: number; }

@Component({
  selector: 'app-loans', standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, DateTimePipe, ClientPickerComponent, ModalComponent, MoneyInputDirective, StatusBadgeComponent],
  template: `
    <div class="page-heading"><div><h1>Préstamos</h1><p>Administra desembolsos, condiciones y refinanciaciones.</p></div><div class="actions"><button class="btn btn-secondary" [disabled]="!selected()" (click)="openEdit()">Editar</button><button class="btn btn-secondary" [disabled]="!canRefinance()" (click)="openRefinance()">Refinanciar</button><button class="btn btn-primary" (click)="openNew()">＋ Nuevo préstamo</button></div></div>
    <section class="panel"><div class="toolbar"><div class="search"><input placeholder="Buscar préstamo, cliente o documento…" (input)="changeSearch($event)"></div><select (change)="changeStatus($event)"><option value="">Todos los estados</option><option>Activo</option><option>En mora</option><option>Refinanciado</option><option>Cancelado</option></select></div>
      <div class="table-wrap"><table><thead><tr><th>Préstamo</th><th>Cliente</th><th>Desembolso</th><th>Fecha préstamo</th><th>Registrado</th><th>Cuota</th><th>Saldo</th><th>Mora</th><th>Estado</th><th>Ruta</th></tr></thead><tbody>
        @for (loan of loans(); track loan.id) {<tr [class.selected]="selected()?.id===loan.id" (click)="selected.set(loan)" (dblclick)="openEdit()"><td><strong>{{loan.number}}</strong></td><td>{{loan.clientName}}</td><td class="money">{{loan.disbursedAmount|currency:'COP':'symbol-narrow':'1.0-0'}}</td><td>{{loan.loanDate|date:'dd/MM/yyyy'}}</td><td>{{loan.createdAt|appDateTime}}</td><td class="money">{{loan.dailyInstallment|currency:'COP':'symbol-narrow':'1.0-0'}}</td><td class="money">{{loan.outstandingPrincipal|currency:'COP':'symbol-narrow':'1.0-0'}}</td><td class="money" [class.text-red]="loan.overdueAmount>0">{{loan.overdueAmount|currency:'COP':'symbol-narrow':'1.0-0'}}</td><td><app-status-badge [value]="loan.status"/></td><td>{{loan.route?.code||'—'}}</td></tr>}
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
          <div class="field"><label class="required">Interés fijo (%)</label><input type="number" min="20" step="0.01" formControlName="interestPercent" (input)="schedulePreview()"><span class="hint">Mínimo permitido: 20 %. No depende del plazo.</span></div>
          <div class="field"><label>Cuota editable</label><input appMoneyInput type="text" inputmode="numeric" formControlName="dailyInstallment" (input)="previewFromInstallment()"><span class="hint">Al cambiarla se recalcula el interés.</span></div>
          <div class="field"><label>Ruta de cobro</label><select formControlName="routeId"><option value="">Sin asignar</option>@for (route of routes(); track route.id) {<option [value]="route.id">{{route.code}} · {{route.name}}</option>}</select></div>
          <div class="field"><label>Asesor</label><input [value]="advisorUsername" readonly><span class="hint">Usuario que registra o edita la operación.</span></div>
        </div>
        @if (preview(); as p) {<div class="loan-preview"><div><span>Capital</span><strong>{{form.value.disbursedAmount|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></div><div><span>Interés</span><strong>{{p.generatedInterest|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></div><div><span>Total a cobrar</span><strong>{{p.total|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></div><div><span>Cuota</span><strong>{{p.dailyInstallment|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></div></div>}
        <div class="form-grid"><div class="field span-2"><label>Observaciones</label><textarea rows="2" formControlName="observations"></textarea></div></div>
      </form>
      <div modal-actions><button class="btn btn-secondary" (click)="modal.set(false)">Cancelar</button><button class="btn btn-success" [disabled]="saving()" (click)="save()">{{saving()?'Guardando…':mode()==='refinance'?'Crear refinanciación':'Guardar préstamo'}}</button></div>
    </app-modal>`,
  styles: [`
    .toolbar select{width:180px}.locked-client{display:grid;gap:4px;padding:14px 16px;border-radius:12px;background:#eef3f6;margin-bottom:20px}.locked-client span,.locked-client small{font-size:9px;color:#718697}.locked-client strong{font-size:14px;color:#183a52}.loan-preview{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#dce7ed;border:1px solid #dce7ed;border-radius:12px;overflow:hidden;margin:19px 0}.loan-preview div{background:#f7fafb;padding:12px}.loan-preview span{display:block;font-size:9px;color:#718697;text-transform:uppercase;font-weight:800}.loan-preview strong{font-size:14px;color:#176b87;margin-top:4px;display:block}.loan-form>.section-title{margin-top:0}@media(max-width:750px){.loan-preview{grid-template-columns:repeat(2,1fr)}}
  `],
})
export class LoansComponent implements OnInit {
  private readonly service = inject(LoansService); private readonly clientService = inject(ClientsService);
  private readonly catalog = inject(CatalogService); private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService); private readonly fb = inject(FormBuilder);
  private searchTimer?: number; private previewTimer?: number;

  readonly loans = signal<Loan[]>([]); readonly clients = signal<Client[]>([]); readonly routes = signal<Route[]>([]);
  readonly selected = signal<Loan | null>(null); readonly total = signal(0); readonly page = signal(1);
  readonly search = signal(''); readonly status = signal(''); readonly loading = signal(false); readonly modal = signal(false);
  readonly mode = signal<LoanMode>('new'); readonly saving = signal(false); readonly preview = signal<LoanPreview | null>(null);
  readonly clientSearch = signal(''); readonly clientPage = signal(1); readonly clientTotal = signal(0); readonly clientLoading = signal(false);

  readonly form = this.fb.group({
    clientId: ['', Validators.required], requestedAmount: [0, [Validators.required, Validators.min(1)]],
    disbursedAmount: [0, [Validators.required, Validators.min(1)]], loanDate: [new Date().toISOString().slice(0, 10), Validators.required],
    installmentCount: [32, [Validators.required, Validators.min(1)]], frequency: ['Diario', Validators.required],
    interestPercent: [28, [Validators.required, Validators.min(20)]], dailyInstallment: [0, [Validators.min(0)]],
    routeId: [''], observations: [''], interestType: ['Fijo'], administrativeFee: [0], insurance: [0],
    additionalCosts: [0], chargeMode: ['Financiados'],
  });

  ngOnInit() { this.load(); this.catalog.routes(true).subscribe((routes) => this.routes.set(routes)); }
  get modalTitle() { return this.mode() === 'new' ? 'Crear préstamo' : this.mode() === 'edit' ? 'Editar préstamo' : `Refinanciar ${this.selected()?.number ?? ''}`; }
  get advisorUsername() { return this.auth.user()?.username ?? '—'; }

  load() { this.loading.set(true); this.service.list(this.search(), this.page(), 25, this.status()).subscribe({ next: (result) => { this.loans.set(result.items); this.total.set(result.total); this.loading.set(false); }, error: (error) => { this.loading.set(false); this.toast.error(error); } }); }
  loadClients(search = this.clientSearch(), page = this.clientPage()) { this.clientLoading.set(true); this.clientService.list(search, page, 15, 'Activo').subscribe({ next: (result) => { this.clients.set(result.items); this.clientTotal.set(result.total); this.clientLoading.set(false); }, error: (error) => { this.clientLoading.set(false); this.toast.error(error); } }); }
  changeSearch(event: Event) { this.search.set((event.target as HTMLInputElement).value); clearTimeout(this.searchTimer); this.searchTimer = window.setTimeout(() => { this.page.set(1); this.load(); }, 300); }
  changeStatus(event: Event) { this.status.set((event.target as HTMLSelectElement).value); this.page.set(1); this.load(); }
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
      this.form.patchValue({ clientId: full.clientId, requestedAmount: full.requestedAmount, disbursedAmount: full.disbursedAmount, loanDate: full.loanDate, installmentCount: full.installmentCount, frequency: full.frequency, interestPercent: Number(full.interestRate) * 100, dailyInstallment: full.dailyInstallment, routeId: full.route?.id ?? '', observations: String(full['observations'] ?? ''), interestType: String(full['interestType'] ?? 'Fijo'), administrativeFee: Number(full['administrativeFee'] ?? 0), insurance: Number(full['insurance'] ?? 0), additionalCosts: Number(full['additionalCosts'] ?? 0), chargeMode: String(full['chargeMode'] ?? 'Financiados') });
      this.updateLocalPreview(false); this.modal.set(true);
    });
  }

  openRefinance() {
    const loan = this.selected(); if (!loan) return; this.mode.set('refinance');
    this.form.reset({ clientId: loan.clientId, requestedAmount: loan.outstandingPrincipal, disbursedAmount: loan.outstandingPrincipal, loanDate: new Date().toISOString().slice(0, 10), installmentCount: 32, frequency: 'Diario', interestPercent: 28, dailyInstallment: 0, routeId: loan.route?.id ?? '', observations: `Refinanciación de ${loan.number}`, interestType: 'Fijo', administrativeFee: 0, insurance: 0, additionalCosts: 0, chargeMode: 'Financiados' });
    this.schedulePreview(); this.modal.set(true);
  }

  canRefinance() { return !!this.selected() && ['Activo', 'En mora'].includes(this.selected()!.status); }
  schedulePreview() { this.updateLocalPreview(false); clearTimeout(this.previewTimer); this.previewTimer = window.setTimeout(() => this.requestPreview(false), 220); }
  previewFromInstallment() { this.updateLocalPreview(true); clearTimeout(this.previewTimer); this.previewTimer = window.setTimeout(() => this.requestPreview(true), 220); }

  private updateLocalPreview(useInstallment: boolean) {
    const raw = this.form.getRawValue(); const principal = Number(raw.disbursedAmount); const count = Number(raw.installmentCount);
    const charges = Number(raw.administrativeFee) + Number(raw.insurance) + Number(raw.additionalCosts);
    if (!principal || !count) { this.preview.set(null); return; }
    let rate = Number(raw.interestPercent) / 100; let installment = Number(raw.dailyInstallment);
    if (useInstallment && installment > 0) rate = ((installment * count) - charges) / principal - 1;
    if (!Number.isFinite(rate) || rate < .2) { this.preview.set(null); return; }
    const interest = Math.round(principal * rate); const total = Math.round(principal + interest + charges);
    if (!useInstallment) installment = Math.round(total / count);
    this.preview.set({ interestRate: rate, generatedInterest: interest, total, dailyInstallment: installment });
    this.form.patchValue(useInstallment ? { interestPercent: Math.round(rate * 10000) / 100 } : { dailyInstallment: installment }, { emitEvent: false });
  }

  private requestPreview(useInstallment: boolean) {
    const raw = this.form.getRawValue();
    if (!raw.disbursedAmount || !raw.installmentCount || Number(raw.interestPercent) < 20 || (useInstallment && !raw.dailyInstallment)) return;
    const body: Record<string, number> = {
      disbursedAmount: Number(raw.disbursedAmount), installmentCount: Number(raw.installmentCount),
      interestRate: Number(raw.interestPercent) / 100, administrativeFee: Number(raw.administrativeFee),
      insurance: Number(raw.insurance), additionalCosts: Number(raw.additionalCosts),
    };
    if (useInstallment) body['dailyInstallment'] = Number(raw.dailyInstallment);
    this.service.preview(body).subscribe({ next: (result) => { this.preview.set(result); this.form.patchValue({ interestPercent: result.interestRate * 100, dailyInstallment: result.dailyInstallment }, { emitEvent: false }); }, error: () => this.preview.set(null) });
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
    if (this.form.invalid) { this.form.markAllAsTouched(); this.toast.show('Completa los campos obligatorios. El interés mínimo es 20%.', 'error'); return; }
    this.saving.set(true); const body = this.payload();
    const request = this.mode() === 'new' ? this.service.create(body) : this.mode() === 'edit' ? this.service.update(this.selected()!.id, body) : this.service.refinance(this.selected()!.id, body);
    request.subscribe({ next: (loan) => { const wasRefinance = this.mode() === 'refinance'; this.saving.set(false); this.modal.set(false); this.selected.set(loan); this.load(); this.toast.show(wasRefinance ? `Refinanciación ${loan.number} creada` : 'Préstamo guardado'); }, error: (error) => { this.saving.set(false); this.toast.error(error); } });
  }
}
