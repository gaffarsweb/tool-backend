import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { PaymentProvider, PaymentStatus, Role } from '@prisma/client';
import type { Request } from 'express';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PrismaService } from '../../database/prisma.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly payments: PaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  // ---- Admin ledger (unchanged from Phase 7) ----
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Get()
  async list(
    @Query('status') status: PaymentStatus | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.payments.list({ status, page, pageSize });
  }

  // ---- User checkout flow ----

  @Post('checkout')
  async createCheckout(
    @CurrentUser() current: AuthenticatedUser | undefined,
    @Body() dto: CreateCheckoutDto,
  ) {
    if (!current) throw new UnauthorizedException();
    const user = await this.prisma.user.findUnique({
      where: { id: current.id },
      select: { email: true },
    });
    if (!user) throw new UnauthorizedException();
    return {
      session: await this.payments.createCheckout(current.id, user.email, dto.planSlug, dto.billingCycle),
    };
  }

  @Post('verify')
  async verify(
    @CurrentUser() current: AuthenticatedUser | undefined,
    @Body() dto: VerifyPaymentDto,
  ) {
    if (!current) throw new UnauthorizedException();
    return this.payments.verifyAndActivate(current.id, dto);
  }

  // ---- Webhook ----
  // Public: signature-verified inside the service. Raw body is required for
  // HMAC verification — main.ts configures express.raw() for this path.

  @Public()
  @Post('webhook/:provider')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Param('provider') providerParam: string,
    @Headers() headers: Record<string, string>,
    @Req() req: Request,
  ) {
    const provider = providerParam.toUpperCase() as PaymentProvider;
    const raw = (req as Request & { rawBody?: Buffer }).rawBody?.toString('utf-8') ?? '';
    if (!raw) {
      this.logger.warn('Webhook arrived without raw body — express.raw() middleware may be misconfigured');
    }
    try {
      const result = await this.payments.processWebhook(provider, headers, raw);
      return { ok: true, ...result };
    } catch (err) {
      // We still return 200 on signature errors for Razorpay so they stop
      // retrying — but logs are loud so we can investigate.
      this.logger.error(
        `Webhook processing failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { ok: false };
    }
  }
}
