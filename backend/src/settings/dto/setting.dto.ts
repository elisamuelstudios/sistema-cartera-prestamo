import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateSettingDto {
  @IsString() value!: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsBoolean() editable?: boolean;
}

