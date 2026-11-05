import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Plan } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';

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
    return plans.map((p) => this.toPublic(p));
  }

  async listAll(): Promise<Plan[]> {
    return this.prisma.plan.findMany({ orderBy: { orderIndex: 'asc' } });
  }

  async get(id: string): Promise<Plan> {
    const row = await this.prisma.plan.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Plan not found');
    return row;
  }

  async create(dto: CreatePlanDto): Promise<Plan> {
    try {
      return await this.prisma.plan.create({
        data: {
          slug: dto.slug,
          name: dto.name,
          tier: dto.tier,
          priceMonthly: dto.priceMonthly,
          priceAnnual: dto.priceAnnual,
          currency: dto.currency ?? 'INR',
          features: dto.features,
          limitsJson: dto.limitsJson as Prisma.InputJsonValue,
          isActive: dto.isActive ?? true,
          orderIndex: dto.orderIndex ?? 0,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A plan with that slug already exists');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdatePlanDto): Promise<Plan> {
    await this.get(id);
    return this.prisma.plan.update({
      where: { id },
      data: {
        ...dto,
        limitsJson: dto.limitsJson as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.get(id);
    try {
      await this.prisma.plan.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new ConflictException('Plan has active subscriptions; downgrade users first');
      }
      throw err;
    }
  }

  toPublic(p: Plan): PublicPlan {
    return {
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
    };
  }
}
