import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PaymentFrequency } from '../../common/enums';
import { CHARGE_MODES, INTEREST_TYPES } from '../../common/finance/interest';
import type { ChargeMode, InterestType } from '../../common/finance/interest';

/**
 * Simulación de crédito (`POST /loans/preview`).
 *
 * Acepta exactamente los mismos parámetros financieros que el alta, de modo que
 * lo que muestra el simulador es lo que se guarda: ambos DTO alimentan la misma
 * función `LoansService.calculate()`.
 */
export class LoanPreviewDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) requestedAmount?: number;

  @Type(() => Number) @IsNumber() @Min(1) disbursedAmount!: number;

  @IsOptional() @IsISO8601() loanDate?: string;

  @Type(() => Number) @IsNumber() @Min(1) @Max(1000) installmentCount!: number;

  @IsOptional() @IsEnum(PaymentFrequency) frequency?: PaymentFrequency;

  /**
   * Tasa **MENSUAL** en decimal: 0,28 = 28 % mensual.
   * El frontend envía `porcentaje / 100`.
   */
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'El interés no puede ser negativo' })
  interestRate!: number;

  @IsOptional()
  @IsIn(INTEREST_TYPES as unknown as string[])
  interestType?: InterestType;

  @IsOptional()
  @IsIn(CHARGE_MODES as unknown as string[])
  chargeMode?: ChargeMode;

  /**
   * Valor de cuota pactado con el cliente. Si se envía, el número de cuotas se
   * deriva del total (`ceil(total / cuota)`) en lugar de tomarse de
   * `installmentCount`.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  dailyInstallment?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  administrativeFee?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) insurance?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  additionalCosts?: number;
}

export class CreateLoanDto {
  @IsUUID() clientId!: string;

  @Type(() => Number) @IsNumber() @Min(1) requestedAmount!: number;

  @Type(() => Number) @IsNumber() @Min(1) disbursedAmount!: number;

  @IsISO8601() loanDate!: string;

  @Type(() => Number) @IsNumber() @Min(1) @Max(1000) installmentCount!: number;

  @IsEnum(PaymentFrequency) frequency!: PaymentFrequency;

  /** Tasa MENSUAL en decimal: 0,28 = 28 % mensual. */
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'El interés no puede ser negativo' })
  interestRate!: number;

  @IsOptional()
  @IsIn(INTEREST_TYPES as unknown as string[])
  interestType?: InterestType;

  @IsOptional()
  @IsIn(CHARGE_MODES as unknown as string[])
  chargeMode?: ChargeMode;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  dailyInstallment?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  administrativeFee?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) insurance?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  additionalCosts?: number;

  @IsOptional() @IsString() advisor?: string;
  @IsOptional() @IsString() observations?: string;
  @IsOptional() @IsUUID() routeId?: string;
}

export class UpdateLoanDto extends PartialType(CreateLoanDto) {}
export class RefinanceLoanDto extends CreateLoanDto {}
