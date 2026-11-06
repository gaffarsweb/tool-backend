import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  BillingCycle,
  PaymentProvider as Provider,
  PaymentStatus,
  Prisma,
  SubscriptionStatus,
  type PaymentStatus as PaymentStatusType,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PaymentProvider } from './providers/payment-provider.interface';
import { RazorpayAdapter } from './providers/razorpay.adapter';
import { StripeAdapter } from './providers/stripe.adapter';
import type {
  CheckoutSession,
  WebhookEventPayload,
} from './providers/payment-provider.interface';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly providers: Record<Provider, PaymentProvider>;

  constructor(
    private readonly prisma: PrismaService,
    razorpay: RazorpayAdapter,
    stripe: StripeAdapter,
  ) {
    this.providers = {
      [Provider.RAZORPAY]: razorpay,
      [Provider.STRIPE]: stripe,
    };
  }

  private providerFor(id: Provider): PaymentProvider {
    const p = this.providers[id];
    if (!p) throw new BadRequestException(`Unknown provider ${id}`);
    return p;
  }

  async list(args: { status?: PaymentStatusType; page?: number; pageSize?: number }) {
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

  async createCheckout(
    userId: string,
    userEmail: string,
    planSlug: string,
    billingCycle: BillingCycle,
    providerId: Provider = Provider.RAZORPAY,
  ): Promise<CheckoutSession> {
    const plan = await this.prisma.plan.findUnique({ where: { slug: planSlug } });
    if (!plan) throw new NotFoundException('Plan not found');
    if (plan.tier === 'FREE') {
      throw new BadRequestException('FREE plan does not require checkout');
    }

    const priceMajor =
      billingCycle === BillingCycle.ANNUAL ? Number(plan.priceAnnual) : Number(plan.priceMonthly);
    if (priceMajor <= 0) throw new BadRequestException('Plan price is not positive');
    // Razorpay expects minor units (paise for INR, cents for USD)
    const amount = Math.round(priceMajor * 100);

    return this.providerFor(providerId).createCheckout({
      userId,
      userEmail,
      planSlug: plan.slug,
      planName: plan.name,
      tier: plan.tier,
      billingCycle,
      amount,
      currency: plan.currency,
    });
  }

  async verifyAndActivate(
    userId: string,
    args: { provider: Provider; orderId: string; paymentId: string; signature: string },
  ): Promise<{ subscriptionId: string }> {
    const provider = this.providerFor(args.provider);
    const verified = await provider.verifyInlinePayment({
      orderId: args.orderId,
      paymentId: args.paymentId,
      signature: args.signature,
    });

    // Signature is good. Record the payment and activate the subscription.
    // We don't know the plan from the inline verify payload, so we look up the
    // pending Payment row (if any) that was created on checkout. In this Phase-9
    // MVP we don't create the Payment row on checkout — webhook/verify is the
    // first write, which is why we require planSlug via query/body in a later
    // refinement. For now, read from the latest active checkout session stored
    // in the Payment table once the webhook has written it.

    const existing = await this.prisma.payment.findUnique({
      where: {
        provider_providerPaymentId: {
          provider: verified.provider,
          providerPaymentId: verified.providerPaymentId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        'Payment record not found — the webhook has not arrived yet. Retry in a few seconds.',
      );
    }
    if (existing.userId !== userId) {
      throw new UnauthorizedException('Payment does not belong to this user');
    }
    if (!existing.subscriptionId) {
      throw new BadRequestException('Payment is not linked to a subscription');
    }

    return { subscriptionId: existing.subscriptionId };
  }

  async processWebhook(
    providerId: Provider,
    headers: Record<string, string>,
    rawBody: string,
  ): Promise<{ handled: boolean }> {
    const provider = this.providerFor(providerId);
    const event = provider.parseWebhook(headers, rawBody);
    return this.applyWebhookEvent(event);
  }

  private async applyWebhookEvent(event: WebhookEventPayload): Promise<{ handled: boolean }> {
    // Idempotency guard — if we've seen this event before, no-op.
    const existingEvent = await this.prisma.webhookEvent.findUnique({
      where: { provider_eventId: { provider: event.provider, eventId: event.eventId } },
    });
    if (existingEvent) {
      this.logger.debug(`Duplicate webhook ${event.provider}:${event.eventId} — skipping`);
      return { handled: false };
    }

    // Resolve user + plan from the Razorpay order notes we stamped on checkout.
    // For Phase 9 we fetch the order from Razorpay to read its `notes.userId/planSlug`.
    const notes = (event.rawPayload as unknown as { payload?: { payment?: { entity?: { notes?: Record<string, string> } } } })
      ?.payload?.payment?.entity?.notes ?? {};
    const userId = notes.userId;
    const planSlug = notes.planSlug;
    const billingCycle = (notes.billingCycle as BillingCycle | undefined) ?? BillingCycle.MONTHLY;

    if (!userId || !planSlug) {
      this.logger.warn(
        `Webhook ${event.eventId} missing userId/planSlug in notes — storing event, not activating`,
      );
      await this.prisma.webhookEvent.create({
        data: {
          provider: event.provider,
          eventId: event.eventId,
          eventType: event.eventType,
          payloadJson: event.rawPayload as Prisma.InputJsonValue,
        },
      });
      return { handled: false };
    }

    const plan = await this.prisma.plan.findUnique({ where: { slug: planSlug } });
    if (!plan) {
      this.logger.warn(`Webhook ${event.eventId} references unknown plan slug ${planSlug}`);
      return { handled: false };
    }

    const now = new Date();
    const periodDays = billingCycle === BillingCycle.ANNUAL ? 365 : 30;
    const periodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

    const paymentStatus: PaymentStatus =
      event.status === 'CAPTURED'
        ? PaymentStatus.CAPTURED
        : event.status === 'FAILED'
          ? PaymentStatus.FAILED
          : event.status === 'REFUNDED'
            ? PaymentStatus.REFUNDED
            : PaymentStatus.PENDING;

    await this.prisma.$transaction(async (tx) => {
      // 1) Record the webhook event (idempotency marker)
      await tx.webhookEvent.create({
        data: {
          provider: event.provider,
          eventId: event.eventId,
          eventType: event.eventType,
          payloadJson: event.rawPayload as Prisma.InputJsonValue,
        },
      });

      if (paymentStatus !== PaymentStatus.CAPTURED) {
        // Record the failed/pending/refunded payment for the admin ledger, but
        // don't flip the subscription to active.
        await tx.payment.upsert({
          where: {
            provider_providerPaymentId: {
              provider: event.provider,
              providerPaymentId: event.providerPaymentId ?? 'unknown',
            },
          },
          create: {
            userId,
            provider: event.provider,
            providerPaymentId: event.providerPaymentId ?? 'unknown',
            providerOrderId: event.providerOrderId,
            amount: event.amount ? event.amount / 100 : 0,
            currency: event.currency ?? plan.currency,
            status: paymentStatus,
            method: event.method,
            failureReason: event.failureReason,
          },
          update: { status: paymentStatus, failureReason: event.failureReason },
        });
        return;
      }

      // 2) Upsert the subscription — one per user
      const subscription = await tx.subscription.upsert({
        where: { userId },
        create: {
          userId,
          planId: plan.id,
          tier: plan.tier,
          status: SubscriptionStatus.ACTIVE,
          billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          provider: event.provider,
        },
        update: {
          planId: plan.id,
          tier: plan.tier,
          status: SubscriptionStatus.ACTIVE,
          billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          provider: event.provider,
        },
      });

      // 3) Record the successful payment, link to subscription
      await tx.payment.upsert({
        where: {
          provider_providerPaymentId: {
            provider: event.provider,
            providerPaymentId: event.providerPaymentId ?? 'unknown',
          },
        },
        create: {
          userId,
          subscriptionId: subscription.id,
          provider: event.provider,
          providerPaymentId: event.providerPaymentId ?? 'unknown',
          providerOrderId: event.providerOrderId,
          amount: event.amount ? event.amount / 100 : Number(plan.priceMonthly),
          currency: event.currency ?? plan.currency,
          status: PaymentStatus.CAPTURED,
          method: event.method,
        },
        update: {
          subscriptionId: subscription.id,
          status: PaymentStatus.CAPTURED,
          method: event.method,
        },
      });
    });

    this.logger.log(`Webhook ${event.eventId} applied: user=${userId} → ${plan.tier}`);
    return { handled: true };
  }
}
