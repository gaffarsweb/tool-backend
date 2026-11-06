import type { BillingCycle, PaymentProvider as Provider } from '@prisma/client';

export interface CheckoutArgs {
  userId: string;
  userEmail: string;
  planSlug: string;
  planName: string;
  tier: 'FREE' | 'PRO' | 'BUSINESS';
  billingCycle: BillingCycle;
  amount: number; // in minor units (e.g. paise)
  currency: string;
}

export interface CheckoutSession {
  provider: Provider;
  orderId: string;
  clientKey: string; // public key / publishable key exposed to frontend
  amount: number;
  currency: string;
  // Extra metadata rendered by the frontend — avoids a second DB call.
  planName: string;
  userEmail: string;
}

export interface VerifyArgs {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface VerifiedPayment {
  provider: Provider;
  providerPaymentId: string;
  providerOrderId: string;
  method?: string;
  rawPayload?: Record<string, unknown>;
}

export interface WebhookEventPayload {
  provider: Provider;
  eventId: string;
  eventType: string;
  providerPaymentId?: string;
  providerOrderId?: string;
  status: 'CAPTURED' | 'FAILED' | 'REFUNDED' | 'PENDING';
  method?: string;
  failureReason?: string;
  amount?: number;
  currency?: string;
  rawPayload: Record<string, unknown>;
}

export abstract class PaymentProvider {
  abstract readonly id: Provider;
  abstract readonly enabled: boolean;

  abstract createCheckout(args: CheckoutArgs): Promise<CheckoutSession>;

  /** Verifies an inline payment response and returns a canonical payment record. */
  abstract verifyInlinePayment(args: VerifyArgs): Promise<VerifiedPayment>;

  /** Validates webhook signature + parses the event into a canonical shape. */
  abstract parseWebhook(headers: Record<string, string>, rawBody: string): WebhookEventPayload;
}
