import { SetMetadata } from '@nestjs/common';
import type { SubscriptionTier } from '@prisma/client';

export const TIER_KEY = 'auth:tier';

/** Requires the authenticated user's subscription tier to meet or exceed the given tier.
 *  Pair with `EntitlementGuard`. */
export const Tier = (tier: SubscriptionTier) => SetMetadata(TIER_KEY, tier);
