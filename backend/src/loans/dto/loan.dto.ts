import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { PaymentFrequency } from '../../common/enums';

export class LoanPreviewDto {
  @Type(() => Number) @IsNumber() @Min(1) disbursedAmount!: number;
  @Type(() => Number) @IsNumber() @Min(1) @Max(1000) installmentCount!: number;
  @Type(() => Number) @IsNumber() @Min(0.2, { message: 'El interés mínimo permitido es 20%' }) interestRate!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) dailyInstallment?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) administrativeFee?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) insurance?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) additionalCosts?: number;
}

export class CreateLoanDto {
  @IsUUID() clientId!: string;
  @Type(() => Number) @IsNumber() @Min(1) requestedAmount!: number;
  @Type(() => Number) @IsNumber() @Min(1) disbursedAmount!: number;
  @IsString() loanDate!: string;
  @Type(() => Number) @IsNumber() @Min(1) @Max(1000) installmentCount!: number;
  @IsEnum(PaymentFrequency) frequency!: PaymentFrequency;
  @Type(() => Number) @IsNumber() @Min(0.2, { message: 'El interés mínimo permitido es 20%' }) interestRate!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) dailyInstallment?: number;
  @IsOptional() @IsString() interestType?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) administrativeFee?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) insurance?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) additionalCosts?: number;
  @IsOptional() @IsString() advisor?: string;
  @IsOptional() @IsString() observations?: string;
  @IsOptional() @IsUUID() routeId?: string;
  @IsOptional() @IsString() chargeMode?: string;
}

export class UpdateLoanDto extends PartialType(CreateLoanDto) {}
export class RefinanceLoanDto extends CreateLoanDto {}
