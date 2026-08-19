import { BadRequestException } from '@nestjs/common';
import { LoansService } from './loans.service';

describe('LoansService financial agreement', () => {
  const service = new LoansService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  it('allows a fixed interest below 10 percent and returns a warning', () => {
    const result = service.preview({
      disbursedAmount: 100_000,
      installmentCount: 10,
      interestRate: 0.05,
      administrativeFee: 0,
      insurance: 0,
      additionalCosts: 0,
    });
    expect(result.total).toBe(105_000);
    expect(result.dailyInstallment).toBe(10_500);
    expect(result.warnings).toHaveLength(1);
  });

  it('keeps the installment count fixed and solves the interest rate from the agreed installment', () => {
    // Réplica del formulario real: el número de cuotas nunca cambia; la tasa
    // se resuelve para que cuota × cuotas = total (500.000 + interés).
    // 16.000 × 45 = 720.000 -> interés = 220.000 -> tasa = 220.000/500.000 = 44 %.
    const result = service.preview({
      disbursedAmount: 500_000,
      installmentCount: 45,
      interestRate: 0.4,
      dailyInstallment: 16_000,
      administrativeFee: 0,
      insurance: 0,
      additionalCosts: 0,
    });
    expect(result.installmentCount).toBe(45);
    expect(result.interestRate).toBeCloseTo(0.44, 4);
    expect(result.generatedInterest).toBeCloseTo(220_000, -1);
    expect(result.total).toBeCloseTo(720_000, -1);
    expect(result.dailyInstallment).toBeCloseTo(16_000, -1);
    expect(result.lastInstallment).toBeCloseTo(16_000, -1);
  });

  it('rejects a negative interest', () => {
    expect(() =>
      service.preview({
        disbursedAmount: 100_000,
        installmentCount: 10,
        interestRate: -0.1,
        administrativeFee: 0,
        insurance: 0,
        additionalCosts: 0,
      }),
    ).toThrow(BadRequestException);
  });
});
