import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionStatus, type SubscriptionTier } from '@prisma/client';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';
import { TIER_KEY } from '../decorators/tier.decorator';
import { PrismaService } from '../../database/prisma.service';

// FREE < PRO < BUSINESS
const TIER_ORDER: Record<SubscriptionTier, number> = {
  FREE: 0,
  PRO: 1,
  BUSINESS: 2,
};

@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<SubscriptionTier | undefined>(TIER_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required === 'FREE') return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = req.user;
    if (!user) {
      throw new HttpException('Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const sub = await this.prisma.subscription.findUnique({
      where: { userId: user.id },
      select: { tier: true, status: true, currentPeriodEnd: true },
    });

    const effectiveTier: SubscriptionTier = sub ? sub.tier : 'FREE';
    const active =
      !!sub &&
      (sub.status === SubscriptionStatus.ACTIVE || sub.status === SubscriptionStatus.TRIALING) &&
      sub.currentPeriodEnd > new Date();

    if (!active || TIER_ORDER[effectiveTier] < TIER_ORDER[required]) {
      // 402 Payment Required — the canonical "needs upgrade" status
      throw new HttpException(
        {
          error: 'PaymentRequired',
          message: `This endpoint requires the ${required} plan or higher`,
          currentTier: effectiveTier,
          requiredTier: required,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return true;
  }
}
