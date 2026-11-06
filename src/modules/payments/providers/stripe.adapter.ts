import { Injectable, NotImplementedException } from '@nestjs/common';
import { PaymentProvider as Provider } from '@prisma/client';
import {
  PaymentProvider,
  type CheckoutArgs,
  type CheckoutSession,
  type VerifiedPayment,
  type VerifyArgs,
  type WebhookEventPayload,
} from './payment-provider.interface';

// Stub — honours the Provider interface but never actually dispatches a real
// Stripe charge. A follow-up phase (Phase 13+) wires @stripe/stripe-node and
// PaymentIntents. Kept in the tree so the admin UI can display Stripe as a
// future option and the webhook controller has an adapter to dispatch to.
@Injectable()
export class StripeAdapter extends PaymentProvider {
  readonly id = Provider.STRIPE;
  readonly enabled = false;

  async createCheckout(_args: CheckoutArgs): Promise<CheckoutSession> {
    throw new NotImplementedException('Stripe is not wired yet');
  }

  async verifyInlinePayment(_args: VerifyArgs): Promise<VerifiedPayment> {
    throw new NotImplementedException('Stripe is not wired yet');
  }

  parseWebhook(_headers: Record<string, string>, _rawBody: string): WebhookEventPayload {
    throw new NotImplementedException('Stripe is not wired yet');
  }
}
