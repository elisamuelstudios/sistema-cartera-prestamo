import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaymentMethod } from '../../common/enums';

export class CreatePaymentDto {
  @IsUUID() loanId!: string;
  @IsString() paymentDate!: string;
  @Type(() => Number) @IsNumber() @Min(1) amount!: number;
  @IsEnum(PaymentMethod) method!: PaymentMethod;
  @IsOptional() @IsString() responsible?: string;
  @IsOptional() @IsString() observations?: string;
}

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {
  loanId?: never;
}

