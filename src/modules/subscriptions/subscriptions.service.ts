import { Injectable } from '@nestjs/common';
import type { Prisma, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(args: {
    status?: SubscriptionStatus;
    page?: number;
    pageSize?: number;
  }) {
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
}
