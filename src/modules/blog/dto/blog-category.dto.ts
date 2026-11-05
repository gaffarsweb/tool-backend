import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateBlogCategoryDto {
  @IsString()
  @Matches(SLUG)
  @MinLength(2)
  @MaxLength(60)
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  slug!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

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

export class UpdateBlogCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

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
