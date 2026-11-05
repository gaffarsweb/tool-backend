import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface PublicPlan {
  id: string;
  slug: string;
  name: string;
  tier: 'FREE' | 'PRO' | 'BUSINESS';
  priceMonthly: number;
  priceAnnual: number;
  currency: string;
  features: string[];
  limits: Record<string, unknown>;
  orderIndex: number;
}

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async listActive(): Promise<PublicPlan[]> {
    const plans = await this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
    });
    return plans.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      tier: p.tier,
      priceMonthly: Number(p.priceMonthly),
      priceAnnual: Number(p.priceAnnual),
      currency: p.currency,
      features: p.features,
      limits: (p.limitsJson as Record<string, unknown>) ?? {},
      orderIndex: p.orderIndex,
    }));
  }
}
