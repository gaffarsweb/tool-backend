import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  siteName?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsUrl()
  faviconUrl?: string;

  @IsOptional()
  socialLinksJson?: Record<string, string>;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  defaultSeoTitleTemplate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  defaultSeoDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  adsenseClientId?: string;
}
