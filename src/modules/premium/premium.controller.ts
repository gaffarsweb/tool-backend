import { Controller, Get, UseGuards } from '@nestjs/common';
import { Tier } from '../../common/decorators/tier.decorator';
import { EntitlementGuard } from '../../common/guards/entitlement.guard';

// Demo endpoints to prove the tier-gated flow end-to-end.
// Phase 10+ gates real premium tool endpoints (OCR, batch, etc.) using the
// same @Tier(...) + EntitlementGuard combo.
@Controller('premium')
@UseGuards(EntitlementGuard)
export class PremiumController {
  @Tier('PRO')
  @Get('ping')
  ping() {
    return { ok: true, message: 'You are PRO or higher.' };
  }

  @Tier('BUSINESS')
  @Get('business-ping')
  businessPing() {
    return { ok: true, message: 'You are BUSINESS tier.' };
  }
}
