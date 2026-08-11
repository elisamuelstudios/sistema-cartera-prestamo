import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateRouteDto {
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() collector?: string;
  @IsOptional() @IsString() zone?: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateRouteDto extends CreateRouteDto {
  @IsOptional() @IsBoolean() active?: boolean;
}

