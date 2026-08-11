import { Directive, ElementRef, forwardRef, HostListener, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

const formatter = new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0,
});

@Directive({
  selector: 'input[appMoneyInput]',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MoneyInputDirective), multi: true }],
})
export class MoneyInputDirective implements ControlValueAccessor {
  private readonly element = inject(ElementRef<HTMLInputElement>);
  private onChange: (value: number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: number | string | null | undefined) {
    const numeric = Number(value);
    this.element.nativeElement.value = value === null || value === undefined || value === '' || !Number.isFinite(numeric)
      ? '' : formatter.format(Math.round(numeric)).replace(/\u00a0/g, ' ');
  }

  registerOnChange(fn: (value: number | null) => void) { this.onChange = fn; }
  registerOnTouched(fn: () => void) { this.onTouched = fn; }
  setDisabledState(disabled: boolean) { this.element.nativeElement.disabled = disabled; }

  @HostListener('input', ['$event'])
  handleInput(event: Event) {
    const raw = (event.target as HTMLInputElement | null)?.value ?? '';
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      this.element.nativeElement.value = '';
      this.onChange(null);
      return;
    }
    const value = Number(digits);
    this.element.nativeElement.value = formatter.format(value).replace(/\u00a0/g, ' ');
    this.onChange(value);
  }

  @HostListener('blur') handleBlur() { this.onTouched(); }
}
