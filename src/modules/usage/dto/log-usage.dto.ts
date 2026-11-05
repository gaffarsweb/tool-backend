import { IsBoolean, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class LogUsageDto {
  @IsString()
  @Length(1, 128)
  toolSlug!: string;

  @IsOptional()
  @IsBoolean()
  success?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(600_000) // cap to 10 min; anything more is instrumentation error
  executionMs?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  inputBytes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  outputBytes?: number;
}
