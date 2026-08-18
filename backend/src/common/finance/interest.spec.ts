import { PaymentFrequency } from '../enums';
import { buildSchedule, periodRate, resolvePrincipal, totalInterest } from './interest';
import { roundBankers } from './money';

/**
 * Tests de paridad contra el sistema Excel (`Sistema_Cartera_Eli.xlsm`).
 *
 * Los valores esperados NO son inventados: se leyeron directamente de las hojas
 * `BD_Prestamos` y `BD_PlanPagos` del libro en producción. Si alguno de estos
 * tests falla, el motor web dejó de producir los mismos planes de pago que el
 * Excel y los saldos de los clientes divergirían.
 */

interface ExcelFixture {
  loan: string;
  principal: number;
  monthlyRate: number;
  installmentCount: number;
  total: number;
  totalInterest: number;
  firstCapital: number;
  firstInterest: number;
  firstAmount: number;
  lastCapital: number;
  lastInterest: number;
  lastAmount: number;
}

const EXCEL_FIXTURES: ExcelFixture[] = [
  // Único caso con empate exacto en .5 -> demuestra el redondeo bancario:
  // Round(150000/32) = Round(4687,5) = 4688 y Round(42000/32) = Round(1312,5) = 1312.
  {
    loan: 'PR-000001',
    principal: 150_000,
    monthlyRate: 0.28,
    installmentCount: 32,
    total: 192_000,
    totalInterest: 42_000,
    firstCapital: 4_688,
    firstInterest: 1_312,
    firstAmount: 6_000,
    lastCapital: 4_672,
    lastInterest: 1_328,
    lastAmount: 6_000,
  },
  {
    loan: 'PR-000002',
    principal: 861_000,
    monthlyRate: 0.324042,
    installmentCount: 114,
    total: 1_140_000,
    totalInterest: 279_000,
    firstCapital: 7_553,
    firstInterest: 2_447,
    firstAmount: 10_000,
    lastCapital: 7_511,
    lastInterest: 2_489,
    lastAmount: 10_000,
  },
  {
    loan: 'PR-000003',
    principal: 46_000,
    monthlyRate: 0.01521739,
    installmentCount: 58,
    total: 46_700,
    totalInterest: 700,
    firstCapital: 793,
    firstInterest: 12,
    firstAmount: 805,
    lastCapital: 799,
    lastInterest: 16,
    lastAmount: 815,
  },
  {
    loan: 'PR-000004',
    principal: 245_000,
    monthlyRate: 0.01163265,
    installmentCount: 53,
    total: 247_850,
    totalInterest: 2_850,
    firstCapital: 4_623,
    firstInterest: 54,
    firstAmount: 4_677,
    lastCapital: 4_604,
    lastInterest: 42,
    lastAmount: 4_646,
  },
  {
    loan: 'PR-000005',
    principal: 216_000,
    monthlyRate: 0.777778,
    installmentCount: 32,
    total: 384_000,
    totalInterest: 168_000,
    firstCapital: 6_750,
    firstInterest: 5_250,
    firstAmount: 12_000,
    lastCapital: 6_750,
    lastInterest: 5_250,
    lastAmount: 12_000,
  },
  {
    loan: 'PR-000006',
    principal: 1_540_000,
    monthlyRate: 0.01909091,
    installmentCount: 32,
    total: 1_569_400,
    totalInterest: 29_400,
    firstCapital: 48_125,
    firstInterest: 919,
    firstAmount: 49_044,
    lastCapital: 48_125,
    lastInterest: 911,
    lastAmount: 49_036,
  },
];

describe('roundBankers (Round de VBA)', () => {
  it('resuelve los empates hacia el entero par', () => {
    expect(roundBankers(1312.5)).toBe(1312);
    expect(roundBankers(4687.5)).toBe(4688);
    expect(roundBankers(918.75)).toBe(919);
    expect(roundBankers(0.5)).toBe(0);
    expect(roundBankers(1.5)).toBe(2);
    expect(roundBankers(2.5)).toBe(2);
  });

  it('redondea normalmente cuando no hay empate', () => {
    expect(roundBankers(793.1034)).toBe(793);
    expect(roundBankers(7552.63)).toBe(7553);
    expect(roundBankers(-1.4)).toBe(-1);
  });
});

describe('periodRate: la tasa es MENSUAL', () => {
  it('divide la tasa mensual entre los períodos del mes', () => {
    expect(periodRate(0.3, PaymentFrequency.DAILY)).toBeCloseTo(0.01, 10);
    expect(periodRate(0.3, PaymentFrequency.WEEKLY)).toBeCloseTo(0.075, 10);
    expect(periodRate(0.3, PaymentFrequency.BIWEEKLY)).toBeCloseTo(0.15, 10);
    expect(periodRate(0.3, PaymentFrequency.MONTHLY)).toBeCloseTo(0.3, 10);
  });
});

describe('resolvePrincipal: modo de cargos', () => {
  const charges = { administrativeFee: 20_000, insurance: 10_000, additionalCosts: 5_000 };

  it('Financiados suma los cargos al capital (por tanto generan interés)', () => {
    const result = resolvePrincipal({
      requestedAmount: 100_000,
      disbursedAmount: 100_000,
      chargeMode: 'Financiados',
      ...charges,
    });
    expect(result.principal).toBe(135_000);
    expect(result.disbursedAmount).toBe(100_000);
    expect(result.charges).toBe(35_000);
  });

  it('Descontados deja el capital en lo solicitado y descuenta del desembolso', () => {
    const result = resolvePrincipal({
      requestedAmount: 100_000,
      disbursedAmount: 100_000,
      chargeMode: 'Descontados',
      ...charges,
    });
    expect(result.principal).toBe(100_000);
    expect(result.disbursedAmount).toBe(65_000);
  });

  it('Externos ignora los cargos para el capital', () => {
    const result = resolvePrincipal({
      requestedAmount: 100_000,
      disbursedAmount: 100_000,
      chargeMode: 'Externos',
      ...charges,
    });
    expect(result.principal).toBe(100_000);
    expect(result.disbursedAmount).toBe(100_000);
  });

  it('usa Financiados cuando el modo llega vacío o inválido', () => {
    expect(resolvePrincipal({ requestedAmount: 0, disbursedAmount: 50_000 }).principal).toBe(50_000);
  });
});

describe('buildSchedule — paridad con el Excel (interés Fijo, frecuencia Diaria)', () => {
  for (const fixture of EXCEL_FIXTURES) {
    describe(fixture.loan, () => {
      const schedule = buildSchedule({
        principal: fixture.principal,
        installmentCount: fixture.installmentCount,
        loanDate: '2026-08-03',
        frequency: PaymentFrequency.DAILY,
        monthlyRate: fixture.monthlyRate,
        interestType: 'Fijo',
      });

      it('reproduce el total y el interés de la hoja', () => {
        expect(schedule.totalInterest).toBe(fixture.totalInterest);
        expect(schedule.total).toBe(fixture.total);
        expect(schedule.rows).toHaveLength(fixture.installmentCount);
      });

      it('reproduce la primera cuota', () => {
        const first = schedule.rows[0];
        expect(first.capital).toBe(fixture.firstCapital);
        expect(first.interest).toBe(fixture.firstInterest);
        expect(first.amount).toBe(fixture.firstAmount);
      });

      it('reproduce la última cuota (absorbe los residuos)', () => {
        const last = schedule.rows[schedule.rows.length - 1];
        expect(last.capital).toBe(fixture.lastCapital);
        expect(last.interest).toBe(fixture.lastInterest);
        expect(last.amount).toBe(fixture.lastAmount);
      });

      it('cumple las invariantes de suma', () => {
        const sum = (pick: (row: (typeof schedule.rows)[number]) => number) =>
          Math.round(schedule.rows.reduce((acc, row) => acc + pick(row), 0) * 100) / 100;
        expect(sum((row) => row.capital)).toBe(fixture.principal);
        expect(sum((row) => row.interest)).toBe(fixture.totalInterest);
        expect(sum((row) => row.amount)).toBe(fixture.total);
      });

      it('cumple amount === capital + interest en toda fila', () => {
        for (const row of schedule.rows) {
          expect(row.amount).toBe(Math.round((row.capital + row.interest) * 100) / 100);
        }
      });
    });
  }
});

describe('buildSchedule — interés fijo no depende del plazo', () => {
  it('cobra el mismo interés con 32 cuotas diarias que con 1 cuota mensual', () => {
    const base = { principal: 150_000, monthlyRate: 0.28, interestType: 'Fijo' as const };
    const daily = totalInterest({
      ...base,
      installmentCount: 32,
      frequency: PaymentFrequency.DAILY,
    });
    const monthly = totalInterest({
      ...base,
      installmentCount: 1,
      frequency: PaymentFrequency.MONTHLY,
    });
    expect(daily).toBe(42_000);
    expect(monthly).toBe(42_000);
  });
});

describe('buildSchedule — interés Sobre saldo', () => {
  const schedule = buildSchedule({
    principal: 150_000,
    installmentCount: 32,
    loanDate: '2026-08-03',
    frequency: PaymentFrequency.DAILY,
    monthlyRate: 0.28,
    interestType: 'Sobre saldo',
  });

  it('cobra menos que el fijo porque el saldo decrece', () => {
    expect(schedule.totalInterest).toBeLessThan(42_000);
    expect(schedule.totalInterest).toBeGreaterThan(0);
  });

  it('cobra la primera cuota con la tasa diaria sobre el capital completo', () => {
    // 150.000 × (0,28 / 30) = 1.400
    expect(schedule.rows[0].interest).toBe(1_400);
  });

  it('el interés decrece cuota a cuota', () => {
    for (let i = 1; i < schedule.rows.length; i += 1) {
      expect(schedule.rows[i].interest).toBeLessThanOrEqual(schedule.rows[i - 1].interest);
    }
  });

  it('amortiza el capital completo', () => {
    const capital = schedule.rows.reduce((acc, row) => acc + row.capital, 0);
    expect(Math.round(capital)).toBe(150_000);
  });
});

describe('buildSchedule — cuota pactada', () => {
  const schedule = buildSchedule({
    principal: 150_000,
    installmentCount: 32,
    loanDate: '2026-08-03',
    frequency: PaymentFrequency.DAILY,
    monthlyRate: 0.28,
    interestType: 'Fijo',
    agreedInstallment: 5_000,
  });

  it('deriva el número de cuotas del total', () => {
    // 192.000 / 5.000 = 38,4 -> 39 cuotas
    expect(schedule.installmentCount).toBe(39);
    expect(schedule.rows).toHaveLength(39);
  });

  it('respeta el valor pactado salvo en la última cuota', () => {
    expect(schedule.rows[0].amount).toBe(5_000);
    expect(schedule.rows[37].amount).toBe(5_000);
    expect(schedule.rows[38].amount).toBe(2_000);
  });

  it('mantiene las invariantes de suma', () => {
    const sum = (pick: (row: (typeof schedule.rows)[number]) => number) =>
      Math.round(schedule.rows.reduce((acc, row) => acc + pick(row), 0) * 100) / 100;
    expect(sum((row) => row.amount)).toBe(192_000);
    expect(sum((row) => row.capital)).toBe(150_000);
    expect(sum((row) => row.interest)).toBe(42_000);
    for (const row of schedule.rows) {
      expect(row.amount).toBe(Math.round((row.capital + row.interest) * 100) / 100);
    }
  });
});

describe('buildSchedule — fechas de vencimiento', () => {
  it('avanza un día por cuota en frecuencia Diaria', () => {
    const schedule = buildSchedule({
      principal: 100_000,
      installmentCount: 3,
      loanDate: '2026-08-03',
      frequency: PaymentFrequency.DAILY,
      monthlyRate: 0.1,
      interestType: 'Fijo',
    });
    expect(schedule.rows.map((row) => row.dueDate)).toEqual([
      '2026-08-04',
      '2026-08-05',
      '2026-08-06',
    ]);
  });

  it('avanza 7, 15 días y 1 mes según la frecuencia', () => {
    const at = (frequency: PaymentFrequency) =>
      buildSchedule({
        principal: 100_000,
        installmentCount: 1,
        loanDate: '2026-08-03',
        frequency,
        monthlyRate: 0.1,
        interestType: 'Fijo',
      }).rows[0].dueDate;
    expect(at(PaymentFrequency.WEEKLY)).toBe('2026-08-10');
    expect(at(PaymentFrequency.BIWEEKLY)).toBe('2026-08-18');
    expect(at(PaymentFrequency.MONTHLY)).toBe('2026-09-03');
  });
});

describe('buildSchedule — validaciones', () => {
  it('rechaza tasas negativas', () => {
    expect(() =>
      buildSchedule({
        principal: 100_000,
        installmentCount: 10,
        loanDate: '2026-08-03',
        frequency: PaymentFrequency.DAILY,
        monthlyRate: -0.1,
        interestType: 'Fijo',
      }),
    ).toThrow(RangeError);
  });

  it('acepta tasa cero (préstamo sin interés)', () => {
    const schedule = buildSchedule({
      principal: 100_000,
      installmentCount: 10,
      loanDate: '2026-08-03',
      frequency: PaymentFrequency.DAILY,
      monthlyRate: 0,
      interestType: 'Fijo',
    });
    expect(schedule.totalInterest).toBe(0);
    expect(schedule.total).toBe(100_000);
    expect(schedule.rows.every((row) => row.interest === 0)).toBe(true);
  });
});
