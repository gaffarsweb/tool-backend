import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { BlogStatus } from '@prisma/client';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateBlogPostDto {
  @IsString()
  @Matches(SLUG)
  @MinLength(2)
  @MaxLength(120)
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  slug!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @IsString()
  @MinLength(10)
  contentMarkdown!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  featuredImageUrl?: string;

  @IsString()
  categoryId!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedToolIds?: string[];

  @IsOptional()
  @IsEnum(BlogStatus)
  status?: BlogStatus;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  seoDescription?: string;
}

export class UpdateBlogPostDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  contentMarkdown?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  featuredImageUrl?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedToolIds?: string[];

  @IsOptional()
  @IsEnum(BlogStatus)
  status?: BlogStatus;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  seoDescription?: string;
}
