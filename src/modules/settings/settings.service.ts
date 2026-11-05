import { Injectable } from '@nestjs/common';
import { Prisma, type SiteSetting } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { UpdateSettingsDto } from './dto/update-settings.dto';

export interface PublicSettings {
  siteName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  socialLinks: Record<string, string>;
  contactEmail: string | null;
  defaultSeoTitleTemplate: string;
  defaultSeoDescription: string;
  adsenseClientId: string | null;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSingleton(): Promise<SiteSetting> {
    return this.prisma.siteSetting.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton' },
      update: {},
    });
  }

  async getPublic(): Promise<PublicSettings> {
    const s = await this.getSingleton();
    return {
      siteName: s.siteName,
      logoUrl: s.logoUrl,
      faviconUrl: s.faviconUrl,
      socialLinks: (s.socialLinksJson as Record<string, string>) ?? {},
      contactEmail: s.contactEmail,
      defaultSeoTitleTemplate: s.defaultSeoTitleTemplate,
      defaultSeoDescription: s.defaultSeoDescription,
      adsenseClientId: s.adsenseClientId,
    };
  }

  async update(dto: UpdateSettingsDto): Promise<SiteSetting> {
    return this.prisma.siteSetting.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        ...dto,
        socialLinksJson: dto.socialLinksJson as Prisma.InputJsonValue | undefined,
      },
      update: {
        ...dto,
        socialLinksJson: dto.socialLinksJson as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
