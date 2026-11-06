import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { RazorpayAdapter } from './providers/razorpay.adapter';
import { StripeAdapter } from './providers/stripe.adapter';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, RazorpayAdapter, StripeAdapter],
  exports: [PaymentsService],
})
export class PaymentsModule {}
