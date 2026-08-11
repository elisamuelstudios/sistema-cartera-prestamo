import { Type } from 'class-transformer';
import { IsNumber, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateCashCloseDto {
  @IsUUID() routeId!: string;
  @IsString() date!: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cashBroughtByCollector?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) baseOne?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) baseTwo?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) insuranceIncome?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) otherIncome?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) totalSales?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) lunchExpense?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) snackExpense?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) stationeryExpense?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) payrollExpense?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) fuelExpense?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) repairExpense?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) extraExpenses?: number;
  @IsOptional() @IsString() expenseComments?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) capitalWithdrawal?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cashToInternal?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) collectorCarryCash?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) mochi?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) bills100000?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) bills50000?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) bills20000?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) bills10000?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) bills5000?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) bills2000?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) coins1000?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) coins500?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) coins200?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) coins100?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) coins50?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) totalExpenses?: number;
  @IsOptional() @Type(() => Number) @IsNumber() initialCash?: number;
  @IsOptional() @Type(() => Number) @IsNumber() cashCount?: number;
  @IsOptional() @IsObject() details?: Record<string, unknown>;
  @IsOptional() @IsString() notes?: string;
}

