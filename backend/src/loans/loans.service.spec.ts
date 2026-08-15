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

  it('keeps the agreed interest and recalculates the payment count from the installment', () => {
    const result = service.preview({
      disbursedAmount: 500_000,
      installmentCount: 45,
      interestRate: 0.4,
      dailyInstallment: 16_000,
      administrativeFee: 0,
      insurance: 0,
      additionalCosts: 0,
    });
    expect(result.interestRate).toBe(0.4);
    expect(result.generatedInterest).toBe(200_000);
    expect(result.total).toBe(700_000);
    expect(result.dailyInstallment).toBe(16_000);
    expect(result.installmentCount).toBe(44);
    expect(result.lastInstallment).toBe(12_000);
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
