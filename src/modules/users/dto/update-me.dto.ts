import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Transform(({ value }: { value: string | undefined }) => value?.trim())
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  professionalRole?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
