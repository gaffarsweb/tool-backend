import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { SubscriptionTier } from '@prisma/client';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreatePlanDto {
  @IsString()
  @Matches(SLUG)
  @MinLength(2)
  @MaxLength(60)
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  slug!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name!: string;

  @IsEnum(SubscriptionTier)
  tier!: SubscriptionTier;

  @IsNumber()
  @Min(0)
  priceMonthly!: number;

  @IsNumber()
  @Min(0)
  priceAnnual!: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(30)
  features!: string[];

  limitsJson!: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  orderIndex?: number;
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsEnum(SubscriptionTier)
  tier?: SubscriptionTier;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceMonthly?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceAnnual?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(30)
  features?: string[];

  @IsOptional()
  limitsJson?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  orderIndex?: number;
}
