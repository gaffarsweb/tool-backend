import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PaymentProvider as Provider } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { TypedConfigService } from '../../../config/typed-config.service';
import {
  PaymentProvider,
  type CheckoutArgs,
  type CheckoutSession,
  type VerifiedPayment,
  type VerifyArgs,
  type WebhookEventPayload,
} from './payment-provider.interface';

interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

interface RazorpayWebhookBody {
  event: string;
  payload: {
    payment?: { entity: RazorpayPaymentEntity };
  };
  // Razorpay events have no standalone `id` field — we derive idempotency key
  // from `payment.entity.id` and `event` type.
}

interface RazorpayPaymentEntity {
  id: string;
  order_id: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  method?: string;
  amount: number;
  currency: string;
  error_description?: string;
}

@Injectable()
export class RazorpayAdapter extends PaymentProvider {
  readonly id = Provider.RAZORPAY;
  private readonly logger = new Logger(RazorpayAdapter.name);

  constructor(private readonly config: TypedConfigService) {
    super();
  }

  get enabled(): boolean {
    return !!this.config.get('RAZORPAY_KEY_ID') && !!this.config.get('RAZORPAY_KEY_SECRET');
  }

  async createCheckout(args: CheckoutArgs): Promise<CheckoutSession> {
    if (!this.enabled) {
      throw new BadRequestException(
        'Razorpay is not configured. Set RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET.',
      );
    }
    const keyId = this.config.get('RAZORPAY_KEY_ID') as string;
    const keySecret = this.config.get('RAZORPAY_KEY_SECRET') as string;

    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
      },
      body: JSON.stringify({
        amount: args.amount,
        currency: args.currency,
        notes: {
          userId: args.userId,
          planSlug: args.planSlug,
          billingCycle: args.billingCycle,
          tier: args.tier,
        },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Razorpay order creation failed: ${res.status} ${text}`);
      throw new BadRequestException('Could not create Razorpay order');
    }
    const order = (await res.json()) as RazorpayOrderResponse;
    return {
      provider: this.id,
      orderId: order.id,
      clientKey: keyId,
      amount: order.amount,
      currency: order.currency,
      planName: args.planName,
      userEmail: args.userEmail,
    };
  }

  async verifyInlinePayment(args: VerifyArgs): Promise<VerifiedPayment> {
    const keySecret = this.config.get('RAZORPAY_KEY_SECRET') as string;
    if (!keySecret) throw new BadRequestException('Razorpay not configured');

    const expected = createHmac('sha256', keySecret)
      .update(`${args.orderId}|${args.paymentId}`)
      .digest('hex');
    if (!this.timingSafeEq(expected, args.signature)) {
      throw new UnauthorizedException('Payment signature did not match');
    }

    // Optionally fetch payment entity for method/status; webhook also updates us.
    return {
      provider: this.id,
      providerOrderId: args.orderId,
      providerPaymentId: args.paymentId,
    };
  }

  parseWebhook(headers: Record<string, string>, rawBody: string): WebhookEventPayload {
    const secret = this.config.get('RAZORPAY_WEBHOOK_SECRET');
    if (!secret) throw new BadRequestException('Razorpay webhook secret not configured');

    const signature = headers['x-razorpay-signature'];
    if (!signature) throw new UnauthorizedException('Missing Razorpay signature header');
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (!this.timingSafeEq(expected, signature)) {
      throw new UnauthorizedException('Invalid Razorpay webhook signature');
    }

    const body = JSON.parse(rawBody) as RazorpayWebhookBody;
    const entity = body.payload?.payment?.entity;
    if (!entity) throw new BadRequestException('Webhook payload missing payment.entity');

    return {
      provider: this.id,
      eventId: `${body.event}:${entity.id}`,
      eventType: body.event,
      providerPaymentId: entity.id,
      providerOrderId: entity.order_id,
      status: this.mapStatus(entity.status),
      method: entity.method,
      failureReason: entity.error_description,
      amount: entity.amount,
      currency: entity.currency,
      rawPayload: body as unknown as Record<string, unknown>,
    };
  }

  private mapStatus(s: RazorpayPaymentEntity['status']): WebhookEventPayload['status'] {
    switch (s) {
      case 'captured':
        return 'CAPTURED';
      case 'failed':
        return 'FAILED';
      case 'refunded':
        return 'REFUNDED';
      default:
        return 'PENDING';
    }
  }

  private timingSafeEq(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}
