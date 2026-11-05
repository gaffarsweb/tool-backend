import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validateEnv } from './env.schema';
import { TypedConfigService } from './typed-config.service';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: (raw) => validateEnv(raw as Record<string, unknown>),
    }),
  ],
  providers: [TypedConfigService],
  exports: [TypedConfigService],
})
export class AppConfigModule {}
