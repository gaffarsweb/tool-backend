import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ToolTier } from '@prisma/client';
import { IsEnum } from 'class-validator';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateToolDto {
  @IsString()
  @Matches(SLUG_PATTERN)
  @MinLength(2)
  @MaxLength(80)
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  slug!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  longDescription?: string;

  @IsString()
  categoryId!: string;

  @IsString()
  @MaxLength(60)
  icon!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  iconColor?: string;

  @IsOptional()
  @IsEnum(ToolTier)
  tier?: ToolTier;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isImplemented?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  howToMarkdown?: string;

  @IsOptional()
  faqsJson?: unknown;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  seoDescription?: string;

  @IsOptional()
  @IsInt()
  orderIndex?: number;
}

export class UpdateToolDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  longDescription?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  icon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  iconColor?: string;

  @IsOptional()
  @IsEnum(ToolTier)
  tier?: ToolTier;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isImplemented?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  howToMarkdown?: string;

  @IsOptional()
  faqsJson?: unknown;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  seoDescription?: string;

  @IsOptional()
  @IsInt()
  orderIndex?: number;
}

export class ToolListQuery {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }: { value: string | boolean }) => value === true || value === 'true')
  featured?: boolean;

  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  pageSize?: number;
}
