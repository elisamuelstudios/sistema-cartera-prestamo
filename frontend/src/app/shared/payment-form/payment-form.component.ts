import { CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnChanges, Output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Payment } from '../../core/models/models';
import { PaymentsService } from '../../core/services/payments.service';
import { ToastService } from '../../core/services/toast.service';
import { MoneyInputDirective } from '../money-input/money-input.directive';

export interface PaymentFormLoan { id: string; number: string; dailyInstallment?: number; }

/**
 * Formulario de registro/edición de un pago, reutilizado desde Pagos (una vez
 * elegido el préstamo) y desde el botón "Pagar" del detalle de Cartera.
 */
@Component({
  selector: 'app-payment-form', standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, MoneyInputDirective],
  template: `
    <form [formGroup]="form">
      <div class="form-grid">
        <div class="field"><label class="required">Fecha del pago</label><input type="date" formControlName="paymentDate"></div>
        <div class="field"><label class="required">Valor pagado</label><input appMoneyInput type="text" inputmode="numeric" formControlName="amount">
          @if (loan.dailyInstallment) {<span class="hint">Cuota sugerida: {{ loan.dailyInstallment | currency:'COP':'symbol-narrow':'1.0-0' }}. El valor no se llena automáticamente.</span>}
        </div>
        <div class="field"><label class="required">Método</label><select formControlName="method"><option>Efectivo</option><option>Transferencia</option><option>Otro</option></select></div>
        <div class="field"><label>Responsable</label><input formControlName="responsible"></div>
        <div class="field span-2"><label>Observaciones</label><textarea rows="3" formControlName="observations"></textarea></div>
      </div>
    </form>
    <div class="payment-form-actions">
      <button class="btn btn-secondary" type="button" (click)="cancelled.emit()">Cancelar</button>
      <button class="btn btn-success" type="button" [disabled]="saving()" (click)="save()">{{ saving() ? 'Guardando…' : (payment ? 'Guardar cambios' : 'Guardar pago') }}</button>
    </div>`,
  styles: [`.payment-form-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px;padding-top:16px;border-top:1px solid #e7edf3}`],
})
export class PaymentFormComponent implements OnChanges {
  @Input({ required: true }) loan!: PaymentFormLoan;
  @Input() payment: Payment | null = null;
  @Output() readonly saved = new EventEmitter<Payment>();
  @Output() readonly cancelled = new EventEmitter<void>();

  private readonly service = inject(PaymentsService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  readonly saving = signal(false);

  readonly form = this.fb.group({
    paymentDate: [new Date().toISOString().slice(0, 10), Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(1)]],
    method: ['Efectivo', Validators.required],
    responsible: [''], observations: [''],
  });

  ngOnChanges() {
    if (this.payment) {
      this.form.reset({ paymentDate: this.payment.paymentDate, amount: this.payment.amount, method: this.payment.method, responsible: this.payment.responsible ?? '', observations: this.payment.observations ?? '' });
    } else {
      this.form.reset({ paymentDate: new Date().toISOString().slice(0, 10), amount: null, method: 'Efectivo', responsible: '', observations: '' });
    }
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.toast.show('Completa los campos obligatorios', 'error'); return; }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body = { ...raw, amount: Number(raw.amount) };
    const request = this.payment
      ? this.service.update(this.payment.id, { paymentDate: body.paymentDate, amount: body.amount, method: body.method, responsible: body.responsible, observations: body.observations })
      : this.service.create({ ...body, loanId: this.loan.id });
    request.subscribe({
      next: (payment) => { this.saving.set(false); this.toast.show(this.payment ? 'Pago actualizado y cartera recalculada' : 'Pago registrado'); this.saved.emit(payment); },
      error: (error) => { this.saving.set(false); this.toast.error(error); },
    });
  }
}
