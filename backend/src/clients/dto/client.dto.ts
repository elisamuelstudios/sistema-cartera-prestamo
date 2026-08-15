import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { ClientStatus } from '../../common/enums';

export class CreateClientDto {
  @IsString() @MinLength(2) firstNames!: string;
  @IsString() @MinLength(2) lastNames!: string;
  @IsString() @MinLength(3) identification!: string;
  @IsOptional() @IsString() birthDate?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() neighborhood?: string;
  @IsOptional() @IsString() city?: string;
  @IsString() @MinLength(7) primaryPhone!: string;
  @IsOptional() @IsString() alternatePhone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() occupation?: string;
  @IsOptional() @IsString() workplace?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) monthlyIncome?: number;
  @IsOptional() @IsString() personalReferences?: string;
  @IsOptional() @IsString() familyReferences?: string;
  @IsOptional() @IsString() observations?: string;
  @IsOptional() @IsEnum(ClientStatus) status?: ClientStatus;
  @IsUUID('4', { message: 'Debes asignar una ruta válida al cliente' })
  routeId!: string;
}

export class UpdateClientDto extends CreateClientDto {}
