import { PaymentFrequency } from '../enums';
import { roundBankers, toMoney } from './money';

/**
 * Motor financiero — única fuente de verdad del cálculo de intereses y planes
 * de pago. Funciones puras, sin dependencias de NestJS ni de TypeORM, para que
 * puedan probarse en aislamiento y reutilizarse desde cualquier capa.
 *
 * Réplica de la lógica de `modSistemaMaestro` del Excel:
 *   - TotalCreditoEstimado
 *   - GenerarPlanPagos
 *   - TasaPeriodoCredito
 *   - CalcularFechaVencimiento
 *
 * CUOTA PACTADA — réplica del formulario interactivo `frmPrestamos` (no del
 * macro de cierre por lotes): el número de cuotas **nunca** se recalcula a
 * partir de la cuota. Si el usuario edita la cuota, se resuelve (por
 * bisección, como `CalcularTasaDesdeCuota`) la tasa de interés que hace que
 * `cuota × cuotas` coincida con el total — igual que `ActualizarInteresDesdeCuota`
 * en el Excel real. Verificado contra el archivo en producción: el botón
 * Guardar nunca envía una cuota pactada aparte, solo la tasa ya resuelta.
 *
 * CONVENCIÓN DE TASA: `monthlyRate` es un decimal **mensual**.
 *   28 % mensual  -> 0.28
 *   122,22 % mensual -> 1.2222
 */

export type InterestType = 'Fijo' | 'Sobre saldo';
export type ChargeMode = 'Financiados' | 'Descontados' | 'Externos';

export const INTEREST_TYPES: readonly InterestType[] = ['Fijo', 'Sobre saldo'] as const;
export const CHARGE_MODES: readonly ChargeMode[] = [
  'Financiados',
  'Descontados',
  'Externos',
] as const;

/** Cuántos períodos de cobro caben en un mes, según la frecuencia. */
export const PERIODS_PER_MONTH: Record<PaymentFrequency, number> = {
  [PaymentFrequency.DAILY]: 30,
  [PaymentFrequency.WEEKLY]: 4,
  [PaymentFrequency.BIWEEKLY]: 2,
  [PaymentFrequency.MONTHLY]: 1,
};

/** Días que avanza cada cuota. `Mensual` se maneja aparte (suma de meses). */
const DAYS_PER_PERIOD: Record<PaymentFrequency, number> = {
  [PaymentFrequency.DAILY]: 1,
  [PaymentFrequency.WEEKLY]: 7,
  [PaymentFrequency.BIWEEKLY]: 15,
  [PaymentFrequency.MONTHLY]: 30,
};

export function isInterestType(value: unknown): value is InterestType {
  return INTEREST_TYPES.includes(value as InterestType);
}

export function isChargeMode(value: unknown): value is ChargeMode {
  return CHARGE_MODES.includes(value as ChargeMode);
}

/** Excel: `TasaPeriodoCredito`. Convierte la tasa mensual a tasa por período. */
export function periodRate(monthlyRate: number, frequency: PaymentFrequency): number {
  return monthlyRate / (PERIODS_PER_MONTH[frequency] ?? 1);
}

/** Excel: `MesesCredito`. Duración del crédito expresada en meses. */
export function creditMonths(installmentCount: number, frequency: PaymentFrequency): number {
  return installmentCount / (PERIODS_PER_MONTH[frequency] ?? 1);
}

export interface PrincipalInput {
  requestedAmount: number;
  disbursedAmount: number;
  administrativeFee?: number;
  insurance?: number;
  additionalCosts?: number;
  chargeMode?: ChargeMode;
}

export interface PrincipalResult {
  /** Capital sobre el que se calcula el interés y que se amortiza. */
  principal: number;
  /** Dinero que efectivamente recibe el cliente. */
  disbursedAmount: number;
  /** Suma de comisión + seguro + gastos adicionales. */
  charges: number;
  chargeMode: ChargeMode;
}

/**
 * Excel: bloque `Select Case modoCargos` de `GuardarPrestamo` / `ActualizarPrestamo`.
 *
 *  Financiados (defecto): el cliente recibe el desembolso y los cargos se suman
 *                         al capital, de modo que SÍ generan interés.
 *  Descontados:           el capital es lo solicitado y los cargos se restan de
 *                         lo que recibe el cliente.
 *  Externos:              los cargos se pagan por fuera; no entran al capital.
 */
export function resolvePrincipal(input: PrincipalInput): PrincipalResult {
  const requested = toMoney(input.requestedAmount);
  const disbursed = toMoney(input.disbursedAmount);
  const charges = toMoney(
    toMoney(input.administrativeFee) + toMoney(input.insurance) + toMoney(input.additionalCosts),
  );
  const chargeMode: ChargeMode = isChargeMode(input.chargeMode) ? input.chargeMode : 'Financiados';

  switch (chargeMode) {
    case 'Descontados':
      return {
        principal: requested,
        disbursedAmount: Math.max(0, toMoney(requested - charges)),
        charges,
        chargeMode,
      };
    case 'Externos':
      return { principal: disbursed, disbursedAmount: disbursed, charges, chargeMode };
    case 'Financiados':
    default:
      return {
        principal: toMoney(disbursed + charges),
        disbursedAmount: disbursed,
        charges,
        chargeMode: 'Financiados',
      };
  }
}

export interface ScheduleInput {
  principal: number;
  installmentCount: number;
  /** Fecha del préstamo en formato ISO `YYYY-MM-DD`. */
  loanDate: string;
  frequency: PaymentFrequency;
  /** Decimal mensual: 0.28 = 28 % mensual. */
  monthlyRate: number;
  interestType: InterestType;
  /**
   * Valor de cuota pactado. Si se indica (> 0), el número de cuotas se deriva
   * del total (`ceil(total / cuota)`) y cada cuota vale exactamente eso, salvo
   * la última que absorbe el residuo.
   */
  agreedInstallment?: number;
}

export interface ScheduleRow {
  number: number;
  dueDate: string;
  capital: number;
  interest: number;
  /** Invariante del motor: `amount === capital + interest` en TODA fila. */
  amount: number;
  remainingBalance: number;
}

export interface ScheduleResult {
  rows: ScheduleRow[];
  installmentCount: number;
  totalInterest: number;
  /** Capital + interés. No incluye cargos si el modo es `Externos`. */
  total: number;
  installmentAmount: number;
  lastInstallment: number;
  /**
   * Tasa mensual efectivamente usada. Coincide con `monthlyRate` de entrada
   * salvo que se haya pactado una cuota: ahí es la tasa resuelta por
   * `solveMonthlyRateForInstallment`.
   */
  monthlyRate: number;
}

/**
 * Excel: `TotalCreditoEstimado`. Interés total del crédito.
 *
 *  Fijo         -> capital × tasa mensual, aplicado UNA sola vez.
 *                  No depende del plazo (comportamiento del Excel).
 *  Sobre saldo  -> por cuota: saldo insoluto × (tasa mensual / períodos por mes).
 */
export function totalInterest(input: {
  principal: number;
  installmentCount: number;
  frequency: PaymentFrequency;
  monthlyRate: number;
  interestType: InterestType;
}): number {
  const { principal, installmentCount, frequency, monthlyRate, interestType } = input;
  if (installmentCount <= 0 || principal <= 0) return 0;

  if (interestType !== 'Sobre saldo') {
    return roundBankers(principal * monthlyRate);
  }

  const rate = periodRate(monthlyRate, frequency);
  const capitalUnit = roundBankers(principal / installmentCount);
  let balance = principal;
  let accumulated = 0;

  for (let number = 1; number <= installmentCount; number += 1) {
    const capital = number === installmentCount ? balance : capitalUnit;
    accumulated += Math.max(0, roundBankers(balance * rate));
    balance = Math.max(0, balance - capital);
  }
  return roundBankers(accumulated);
}

/**
 * Excel: `CalcularTasaDesdeCuota`. Dado que se pactó una cuota fija, resuelve
 * por bisección la tasa mensual que hace que `cuota × cuotas` (el total
 * acordado) coincida con `principal + totalInterest(...)`. `totalInterest`
 * es monótona creciente en la tasa para ambos tipos de interés, así que la
 * bisección converge siempre.
 */
export function solveMonthlyRateForInstallment(input: {
  principal: number;
  installmentCount: number;
  frequency: PaymentFrequency;
  interestType: InterestType;
  targetInstallment: number;
}): number {
  const { principal, installmentCount, frequency, interestType } = input;
  const targetInstallment = toMoney(input.targetInstallment);
  const target = toMoney(targetInstallment * installmentCount);
  if (principal <= 0 || installmentCount <= 0 || target <= principal) return 0;

  const totalAt = (rate: number) =>
    principal +
    totalInterest({ principal, installmentCount, frequency, monthlyRate: rate, interestType });

  let low = 0;
  let high = 1;
  while (totalAt(high) < target && high < 1000) {
    high *= 2;
  }
  for (let i = 0; i < 60; i += 1) {
    const mid = (low + high) / 2;
    if (totalAt(mid) < target) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/** Excel: `CalcularFechaVencimiento`. */
export function dueDateFor(loanDate: string, frequency: PaymentFrequency, number: number): string {
  const date = new Date(`${loanDate}T12:00:00Z`);
  if (frequency === PaymentFrequency.MONTHLY) {
    date.setUTCMonth(date.getUTCMonth() + number);
  } else {
    date.setUTCDate(date.getUTCDate() + number * DAYS_PER_PERIOD[frequency]);
  }
  return date.toISOString().slice(0, 10);
}

/**
 * Excel: `GenerarPlanPagos`.
 *
 * Garantías del resultado:
 *   1. `amount === capital + interest` en cada fila.
 *   2. `Σ capital === principal` exacto.
 *   3. `Σ interest === totalInterest` exacto (el residuo va a la última cuota).
 *   4. `Σ amount === total` exacto.
 */
export function buildSchedule(input: ScheduleInput): ScheduleResult {
  const principal = toMoney(input.principal);
  let monthlyRate = Number(input.monthlyRate);
  const interestType: InterestType = isInterestType(input.interestType)
    ? input.interestType
    : 'Fijo';

  if (!Number.isFinite(monthlyRate) || monthlyRate < 0) {
    throw new RangeError('La tasa de interés no puede ser negativa');
  }

  // El número de cuotas SIEMPRE es el indicado; nunca se recalcula a partir
  // de la cuota pactada (ver nota de "CUOTA PACTADA" arriba).
  const installmentCount = Math.max(1, Math.round(Number(input.installmentCount) || 0));

  const agreed = toMoney(input.agreedInstallment);
  const useAgreed = agreed > 0;
  if (useAgreed) {
    monthlyRate = solveMonthlyRateForInstallment({
      principal,
      installmentCount,
      frequency: input.frequency,
      interestType,
      targetInstallment: agreed,
    });
  }

  const interest = totalInterest({
    principal,
    installmentCount,
    frequency: input.frequency,
    monthlyRate,
    interestType,
  });
  const total = toMoney(principal + interest);

  const rows: ScheduleRow[] =
    interestType === 'Sobre saldo'
      ? decliningBalanceRows(principal, installmentCount, monthlyRate, input.frequency)
      : flatRows(principal, interest, installmentCount);

  let balance = total;
  for (const row of rows) {
    row.dueDate = dueDateFor(input.loanDate, input.frequency, row.number);
    balance = toMoney(balance - row.amount);
    row.remainingBalance = Math.max(0, balance);
  }

  return {
    rows,
    installmentCount,
    totalInterest: interest,
    total,
    installmentAmount: rows[0]?.amount ?? 0,
    lastInstallment: rows[rows.length - 1]?.amount ?? 0,
    monthlyRate,
  };
}

/**
 * Interés fijo repartido en partes iguales entre las cuotas: capital =
 * Round(capital/n), interés = Round(interésTotal/n), y la última cuota
 * absorbe ambos residuos.
 */
function flatRows(principal: number, interest: number, installmentCount: number): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  const capitalUnit = roundBankers(principal / installmentCount);
  const interestUnit = roundBankers(interest / installmentCount);
  let capitalLeft = principal;
  let interestLeft = interest;

  for (let number = 1; number <= installmentCount; number += 1) {
    const last = number === installmentCount;
    const capital = last ? toMoney(capitalLeft) : capitalUnit;
    const rowInterest = last ? toMoney(interestLeft) : interestUnit;
    capitalLeft = toMoney(capitalLeft - capital);
    interestLeft = toMoney(interestLeft - rowInterest);
    rows.push({
      number,
      dueDate: '',
      capital,
      interest: Math.max(0, rowInterest),
      amount: toMoney(capital + Math.max(0, rowInterest)),
      remainingBalance: 0,
    });
  }
  return rows;
}

/** Interés sobre saldo insoluto. Excel: rama `InStr(tipoInteres,"saldo") > 0`. */
function decliningBalanceRows(
  principal: number,
  installmentCount: number,
  monthlyRate: number,
  frequency: PaymentFrequency,
): ScheduleRow[] {
  const rate = periodRate(monthlyRate, frequency);
  const capitalUnit = roundBankers(principal / installmentCount);
  const rows: ScheduleRow[] = [];
  let balance = principal;

  for (let number = 1; number <= installmentCount; number += 1) {
    const capital = number === installmentCount ? toMoney(balance) : capitalUnit;
    const interest = Math.max(0, roundBankers(balance * rate));
    balance = Math.max(0, toMoney(balance - capital));
    rows.push({
      number,
      dueDate: '',
      capital,
      interest,
      amount: toMoney(capital + interest),
      remainingBalance: 0,
    });
  }
  return rows;
}
