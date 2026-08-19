import { CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Route } from '../../core/models/models';
import { CatalogService } from '../../core/services/catalog.service';
import { OperationsService } from '../../core/services/operations.service';
import { ToastService } from '../../core/services/toast.service';
import { DateTimePipe } from '../../shared/date-time/date-time.pipe';
import { ModalComponent } from '../../shared/modal/modal.component';
import { MoneyInputDirective } from '../../shared/money-input/money-input.directive';

interface CloseSummary {
  routeId: string; routeCode: string; routeName: string; collector?: string; date: string;
  invoicesIn: number; invoicesOut: number; paidInvoices: number; waitingInvoices: number;
  salesPayments: number; cancelledPayments: number; refinancedLoans: number; refinancedAmount: number;
  expectedAmount: number; receivedAmount: number; effectiveness: number; mochi: number; gota: number;
  gotaPercentage: number; ratingPercentage: number; initialCash: number;
  cashBroughtByCollector: number; totalSales: number;
}

@Component({
  selector: 'app-cash-closures', standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, DateTimePipe, PercentPipe, ModalComponent, MoneyInputDirective],
  template: `
    <div class="page-heading"><div><h1>Cierre de caja</h1><p>Captura el movimiento completo y precarga el informe desde pagos, cuotas y refinanciaciones.</p></div><button class="btn btn-primary" (click)="openNew()">＋ Nuevo cierre</button></div>
    <section class="panel"><div class="toolbar"><select (change)="filterRoute($event)"><option value="">Todas las rutas</option>@for (route of routes(); track route.id) {<option [value]="route.id">{{route.code}} · {{route.name}}</option>}</select></div><div class="table-wrap"><table><thead><tr><th>Cierre</th><th>Fecha</th><th>Registrado</th><th>Ruta</th><th>Cobrador</th><th>Esperado</th><th>Recibido</th><th>Abono efectivo</th><th>Carga deuda interna</th><th>Efectividad</th><th>Caja final</th><th>Diferencia</th></tr></thead><tbody>
      @for (item of closures(); track item.id) {<tr><td><strong>{{item.number}}</strong></td><td>{{item.date|date:'dd/MM/yyyy'}}</td><td>{{item.createdAt|appDateTime}}</td><td>{{item.route?.code}}</td><td>{{item.collector||'—'}}</td><td class="money">{{item.expectedAmount|currency:'COP':'symbol-narrow':'1.0-0'}}</td><td class="money">{{item.receivedAmount|currency:'COP':'symbol-narrow':'1.0-0'}}</td><td class="money">{{item.cashAbono|currency:'COP':'symbol-narrow':'1.0-0'}}</td><td class="money">{{item.internalDebtCharge|currency:'COP':'symbol-narrow':'1.0-0'}}</td><td>{{item.effectiveness|percent:'1.0-1'}}</td><td class="money">{{item.finalCash|currency:'COP':'symbol-narrow':'1.0-0'}}</td><td class="money" [class.text-red]="item.difference!==0">{{item.difference|currency:'COP':'symbol-narrow':'1.0-0'}}</td></tr>}
    </tbody></table>@if (!closures().length) {<div class="empty">No hay cierres registrados.</div>}</div></section>

    <app-modal [open]="modal()" [wide]="true" title="Nuevo cierre de caja" (closed)="modal.set(false)">
      <form [formGroup]="form" class="close-form">
        <section class="block"><h3>Datos del cierre</h3><div class="form-grid three"><div class="field"><label class="required">Ruta</label><select formControlName="routeId" (change)="loadSummary()"><option value="">Selecciona</option>@for (route of routes(); track route.id) {<option [value]="route.id">{{route.code}} · {{route.name}}</option>}</select></div><div class="field"><label class="required">Fecha</label><input type="date" formControlName="date" (change)="loadSummary()"></div><div class="field"><label>Cobrador</label><input [value]="summary()?.collector||'Selecciona una ruta'" readonly></div></div></section>

        <section class="block"><h3>Movimiento de efectivo</h3><div class="form-grid three">
          <div class="field"><label>Efectivo que trae el cobrador</label><input appMoneyInput type="text" inputmode="numeric" formControlName="cashBroughtByCollector" readonly><span class="hint">Saldo que llevaba el cobrador en el cierre anterior.</span></div>
          <div class="field"><label>Base 1 - nuevo efectivo</label><input appMoneyInput type="text" inputmode="numeric" formControlName="baseOne"></div>
          <div class="field"><label>Base 2 - retiro caja interna</label><input appMoneyInput type="text" inputmode="numeric" formControlName="baseTwo"></div>
          <div class="field"><label>Seguro</label><input appMoneyInput type="text" inputmode="numeric" formControlName="insuranceIncome"></div>
          <div class="field"><label>Otros ingresos</label><input appMoneyInput type="text" inputmode="numeric" formControlName="otherIncome"></div>
          <div class="field"><label>Total venta</label><input appMoneyInput type="text" inputmode="numeric" formControlName="totalSales" readonly><span class="hint">Desembolsos registrados en la fecha y ruta.</span></div>
          <div class="field"><label>Recibido para retiro de capital</label><input appMoneyInput type="text" inputmode="numeric" formControlName="capitalWithdrawal"></div>
          <div class="field"><label>Guardar en caja interna</label><input appMoneyInput type="text" inputmode="numeric" formControlName="cashToInternal"></div>
          <div class="field"><label>Efectivo que se lleva el cobrador</label><input appMoneyInput type="text" inputmode="numeric" formControlName="collectorCarryCash"></div>
          <div class="field"><label>Abono en efectivo</label><input appMoneyInput type="text" inputmode="numeric" formControlName="cashAbono"><span class="hint">Efectivo adicional que entra a caja.</span></div>
          <div class="field"><label>Deudor interno</label><input formControlName="internalDebtorName" placeholder="Nombre del deudor"></div>
          <div class="field"><label>Carga deuda interna</label><input appMoneyInput type="text" inputmode="numeric" formControlName="internalDebtCharge"><span class="hint">Efectivo que sale de caja para el deudor interno.</span></div>
        </div></section>

        <section class="block"><div class="block-head"><h3>Gastos</h3><strong>{{totalExpenses|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></div><div class="form-grid three">
          <div class="field"><label>Almuerzo</label><input appMoneyInput type="text" inputmode="numeric" formControlName="lunchExpense"></div>
          <div class="field"><label>Merienda</label><input appMoneyInput type="text" inputmode="numeric" formControlName="snackExpense"></div>
          <div class="field"><label>Papelería</label><input appMoneyInput type="text" inputmode="numeric" formControlName="stationeryExpense"></div>
          <div class="field"><label>Nómina</label><input appMoneyInput type="text" inputmode="numeric" formControlName="payrollExpense"></div>
          <div class="field"><label>Gasolina</label><input appMoneyInput type="text" inputmode="numeric" formControlName="fuelExpense"></div>
          <div class="field"><label>Reparación</label><input appMoneyInput type="text" inputmode="numeric" formControlName="repairExpense"></div>
          <div class="field"><label>Gastos extras</label><input appMoneyInput type="text" inputmode="numeric" formControlName="extraExpenses"></div>
          <div class="field span-2"><label>Comentario sobre los gastos</label><textarea rows="2" formControlName="expenseComments"></textarea></div>
        </div></section>

        <section class="auto-report"><div class="report-head"><div><span>Informe automático</span><strong>{{summary()?.routeName||'Selecciona una ruta'}}</strong></div><small>{{summary()?.date|date:'dd/MM/yyyy'}}</small></div>
          @if (summary(); as s) {<div class="metric-grid">
            <div><span>Facturas entran</span><strong>{{s.invoicesIn}}</strong></div><div><span>Facturas salen</span><strong>{{s.invoicesOut}}</strong></div>
            <div><span>Facturas pagaron</span><strong>{{s.paidInvoices}}</strong></div><div><span>Esperan pago</span><strong>{{s.waitingInvoices}}</strong></div>
            <div><span>Abonos ventas</span><strong>{{s.salesPayments|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></div><div><span>Abonos cancelados</span><strong>{{s.cancelledPayments|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></div>
            <div><span>Préstamos refinanciados</span><strong>{{s.refinancedAmount|currency:'COP':'symbol-narrow':'1.0-0'}}</strong><small>{{s.refinancedLoans}} operación(es)</small></div>
            <div><span>Monto esperado</span><strong>{{s.expectedAmount|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></div>
            <div><span>Monto recibido</span><strong>{{s.receivedAmount|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></div><div><span>Efectividad</span><strong>{{s.effectiveness|percent:'1.0-1'}}</strong></div>
            <div><span>Gota</span><strong>{{s.gota|currency:'COP':'symbol-narrow':'1.0-0'}}</strong><small>{{s.gotaPercentage|percent:'1.0-1'}}</small></div><div><span>Rating</span><strong>{{s.ratingPercentage|percent:'1.0-1'}}</strong></div>
            <div><span>Caja interna inicial</span><strong>{{s.initialCash|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></div><div><span>Moche</span><strong>{{s.mochi|currency:'COP':'symbol-narrow':'1.0-0'}}</strong><small>Saldo absorbido al refinanciar</small></div>
          </div>} @else {<p>Selecciona ruta y fecha para calcular el informe.</p>}
        </section>

        <section class="block"><div class="block-head"><h3>Ayuda para contar efectivo</h3><strong>{{cashCount|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></div><div class="denomination-grid">
          <div class="field"><label>Billetes $100.000</label><input type="number" min="0" formControlName="bills100000"></div><div class="field"><label>$50.000</label><input type="number" min="0" formControlName="bills50000"></div><div class="field"><label>$20.000</label><input type="number" min="0" formControlName="bills20000"></div><div class="field"><label>$10.000</label><input type="number" min="0" formControlName="bills10000"></div><div class="field"><label>$5.000</label><input type="number" min="0" formControlName="bills5000"></div><div class="field"><label>$2.000</label><input type="number" min="0" formControlName="bills2000"></div>
          <div class="field"><label>Monedas $1.000</label><input type="number" min="0" formControlName="coins1000"></div><div class="field"><label>$500</label><input type="number" min="0" formControlName="coins500"></div><div class="field"><label>$200</label><input type="number" min="0" formControlName="coins200"></div><div class="field"><label>$100</label><input type="number" min="0" formControlName="coins100"></div><div class="field"><label>$50</label><input type="number" min="0" formControlName="coins50"></div>
        </div></section>

        <section class="totals"><div><span>Total ingresos</span><strong>{{totalIncome|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></div><div><span>Total gastos</span><strong>{{totalExpenses|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></div><div><span>Caja final calculada</span><strong>{{calculatedFinal|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></div><div><span>Conteo efectivo</span><strong>{{cashCount|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></div><div><span>Diferencia</span><strong [class.text-red]="difference!==0">{{difference|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></div></section>
        <section class="block"><div class="field"><label>Notas generales</label><textarea rows="3" formControlName="notes"></textarea></div></section>
      </form>
      <div modal-actions><button class="btn btn-secondary" (click)="modal.set(false)">Cancelar</button><button class="btn btn-success" [disabled]="saving()" (click)="save()">{{saving()?'Guardando…':'Guardar cierre'}}</button></div>
    </app-modal>`,
  styles: [`
    .toolbar select{width:210px}.close-form{display:grid;gap:16px}.block{border:1px solid #e1e9ee;border-radius:13px;padding:15px}.block h3{font-size:13px;color:#1f425a;margin:0 0 13px}.block-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:13px}.block-head h3{margin:0}.block-head strong{color:#176b87}.auto-report{background:#10243e;color:#fff;border-radius:14px;padding:18px}.report-head{display:flex;align-items:flex-end;justify-content:space-between;gap:15px;border-bottom:1px solid rgba(255,255,255,.12);padding-bottom:14px}.report-head div{display:grid;gap:3px}.report-head span{text-transform:uppercase;color:#69c4dc;font-size:8px;font-weight:900;letter-spacing:.1em}.report-head strong{font-size:14px}.report-head small{color:#9db2bf;font-size:9px}.metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:14px}.metric-grid>div{background:rgba(255,255,255,.06);border-radius:8px;padding:9px;min-width:0}.metric-grid span{display:block;font-size:8px;color:#9db2bf}.metric-grid strong{display:block;margin-top:3px;font-size:12px;white-space:nowrap}.metric-grid small{font-size:8px;color:#73d3b0}.editable-metric input{margin-top:5px;padding:6px 8px;background:rgba(255,255,255,.94)}.denomination-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}.totals{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:1px;background:#dce7ed;border:1px solid #dce7ed;border-radius:12px;overflow:hidden}.totals div{background:#f7fafb;padding:12px}.totals span{display:block;font-size:8px;color:#718697;text-transform:uppercase;font-weight:800}.totals strong{font-size:12px;color:#176b87;margin-top:4px;display:block}@media(max-width:800px){.metric-grid{grid-template-columns:repeat(2,1fr)}.denomination-grid{grid-template-columns:repeat(3,1fr)}.totals{grid-template-columns:repeat(2,1fr)}}
  `],
})
export class CashClosuresComponent implements OnInit {
  private readonly service = inject(OperationsService); private readonly catalog = inject(CatalogService);
  private readonly toast = inject(ToastService); private readonly fb = inject(FormBuilder);
  readonly routes = signal<Route[]>([]); readonly closures = signal<any[]>([]); readonly summary = signal<CloseSummary | null>(null);
  readonly modal = signal(false); readonly saving = signal(false);
  readonly form = this.fb.group({
    routeId: ['', Validators.required], date: [new Date().toISOString().slice(0, 10), Validators.required],
    cashBroughtByCollector: [0], baseOne: [0], baseTwo: [0], insuranceIncome: [0], otherIncome: [0], totalSales: [0],
    lunchExpense: [0], snackExpense: [0], stationeryExpense: [0], payrollExpense: [0], fuelExpense: [0], repairExpense: [0], extraExpenses: [0], expenseComments: [''],
    capitalWithdrawal: [0], cashToInternal: [0], collectorCarryCash: [0], mochi: [0],
    cashAbono: [0], internalDebtorName: [''], internalDebtCharge: [0],
    bills100000: [0], bills50000: [0], bills20000: [0], bills10000: [0], bills5000: [0], bills2000: [0],
    coins1000: [0], coins500: [0], coins200: [0], coins100: [0], coins50: [0], notes: [''],
  });

  ngOnInit() { this.catalog.routes(true).subscribe((routes) => this.routes.set(routes)); this.load(); }
  get totalExpenses() { const v = this.form.getRawValue(); return ['lunchExpense','snackExpense','stationeryExpense','payrollExpense','fuelExpense','repairExpense','extraExpenses'].reduce((sum, key) => sum + Number(v[key as keyof typeof v] || 0), 0); }
  get totalIncome() { const v = this.form.getRawValue(); return Number(this.summary()?.receivedAmount || 0) + Number(v.insuranceIncome || 0) + Number(v.otherIncome || 0) + Number(this.summary()?.totalSales || 0) + Number(v.cashAbono || 0); }
  get cashCount() { const v = this.form.getRawValue(); return Number(v.bills100000 || 0)*100000 + Number(v.bills50000 || 0)*50000 + Number(v.bills20000 || 0)*20000 + Number(v.bills10000 || 0)*10000 + Number(v.bills5000 || 0)*5000 + Number(v.bills2000 || 0)*2000 + Number(v.coins1000 || 0)*1000 + Number(v.coins500 || 0)*500 + Number(v.coins200 || 0)*200 + Number(v.coins100 || 0)*100 + Number(v.coins50 || 0)*50; }
  get calculatedFinal() { const v = this.form.getRawValue(); return Number(this.summary()?.initialCash || 0) + this.totalIncome - this.totalExpenses - Number(v.capitalWithdrawal || 0) - Number(v.cashToInternal || 0) - Number(v.internalDebtCharge || 0); }
  get difference() { return this.cashCount - this.calculatedFinal; }

  load(routeId = '') { this.service.closures(routeId).subscribe({ next: (result) => this.closures.set(result), error: (error) => this.toast.error(error) }); }
  filterRoute(event: Event) { this.load((event.target as HTMLSelectElement).value); }
  openNew() {
    this.form.reset({ routeId: '', date: new Date().toISOString().slice(0, 10), cashBroughtByCollector: 0, baseOne: 0, baseTwo: 0, insuranceIncome: 0, otherIncome: 0, totalSales: 0, lunchExpense: 0, snackExpense: 0, stationeryExpense: 0, payrollExpense: 0, fuelExpense: 0, repairExpense: 0, extraExpenses: 0, expenseComments: '', capitalWithdrawal: 0, cashToInternal: 0, collectorCarryCash: 0, mochi: 0, cashAbono: 0, internalDebtorName: '', internalDebtCharge: 0, bills100000: 0, bills50000: 0, bills20000: 0, bills10000: 0, bills5000: 0, bills2000: 0, coins1000: 0, coins500: 0, coins200: 0, coins100: 0, coins50: 0, notes: '' });
    this.summary.set(null); this.modal.set(true);
  }
  loadSummary() { const { routeId, date } = this.form.getRawValue(); if (!routeId || !date) { this.summary.set(null); return; } this.service.closeSummary(routeId, date).subscribe({ next: (result) => { this.summary.set(result); this.form.patchValue({ cashBroughtByCollector: result.cashBroughtByCollector ?? 0, totalSales: result.totalSales ?? 0, mochi: result.mochi ?? 0 }); }, error: (error) => this.toast.error(error) }); }
  save() {
    if (this.form.invalid || !this.summary()) { this.form.markAllAsTouched(); this.toast.show('Selecciona la ruta y completa los campos obligatorios', 'error'); return; }
    this.saving.set(true); const body = { ...this.form.getRawValue(), totalExpenses: this.totalExpenses, initialCash: this.summary()!.initialCash, cashCount: this.cashCount };
    this.service.createClose(body).subscribe({ next: () => { this.saving.set(false); this.modal.set(false); this.load(); this.toast.show('Cierre de caja guardado'); }, error: (error) => { this.saving.set(false); this.toast.error(error); } });
  }
}
