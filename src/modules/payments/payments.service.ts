import { Injectable } from '@nestjs/common';
import type { PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(args: { status?: PaymentStatus; page?: number; pageSize?: number }) {
    const page = args.page ?? 1;
    const pageSize = Math.min(args.pageSize ?? 20, 100);
    const where: Prisma.PaymentWhereInput = {};
    if (args.status) where.status = args.status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        include: { user: { select: { email: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return {
      items: items.map((p) => ({ ...p, amount: Number(p.amount) })),
      total,
      page,
      pageSize,
    };
  }
}
