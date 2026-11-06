import { IsEnum, IsString } from 'class-validator';
import { PaymentProvider } from '@prisma/client';

export class VerifyPaymentDto {
  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  @IsString()
  orderId!: string;

  @IsString()
  paymentId!: string;

  @IsString()
  signature!: string;
}
