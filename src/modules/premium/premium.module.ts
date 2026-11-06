import { Module } from '@nestjs/common';
import { PremiumController } from './premium.controller';

@Module({
  controllers: [PremiumController],
})
export class PremiumModule {}
