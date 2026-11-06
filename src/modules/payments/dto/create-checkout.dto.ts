import { IsEnum, IsString, MaxLength } from 'class-validator';
import { BillingCycle } from '@prisma/client';

export class CreateCheckoutDto {
  @IsString()
  @MaxLength(80)
  planSlug!: string;

  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;
}
