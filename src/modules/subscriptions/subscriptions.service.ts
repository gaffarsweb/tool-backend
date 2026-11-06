import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionStatus, type Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface MySubscription {
  tier: 'FREE' | 'PRO' | 'BUSINESS';
  status: SubscriptionStatus | 'NONE';
  billingCycle: 'MONTHLY' | 'ANNUAL' | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  plan: { slug: string; name: string } | null;
}

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(args: { status?: SubscriptionStatus; page?: number; pageSize?: number }) {
    const page = args.page ?? 1;
    const pageSize = Math.min(args.pageSize ?? 20, 100);
    const where: Prisma.SubscriptionWhereInput = {};
    if (args.status) where.status = args.status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        where,
        include: {
          user: { select: { email: true, name: true } },
          plan: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.subscription.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async getForUser(userId: string): Promise<MySubscription> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: { select: { slug: true, name: true } } },
    });
    if (!sub) {
      return {
        tier: 'FREE',
        status: 'NONE',
        billingCycle: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        plan: null,
      };
    }
    return {
      tier: sub.tier,
      status: sub.status,
      billingCycle: sub.billingCycle,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      plan: sub.plan ? { slug: sub.plan.slug, name: sub.plan.name } : null,
    };
  }

  async cancelAtPeriodEnd(userId: string): Promise<MySubscription> {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new NotFoundException('No active subscription');
    await this.prisma.subscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: true },
    });
    return this.getForUser(userId);
  }
}
