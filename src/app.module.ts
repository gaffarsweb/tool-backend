import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AppConfigModule } from './config/config.module';
import { TypedConfigService } from './config/typed-config.service';
import { PrismaModule } from './database/prisma.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PlansModule } from './modules/plans/plans.module';
import { ContactModule } from './modules/contact/contact.module';
import { UsageModule } from './modules/usage/usage.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ToolsModule } from './modules/tools/tools.module';
import { BlogModule } from './modules/blog/blog.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AdminModule } from './modules/admin/admin.module';
import { PremiumModule } from './modules/premium/premium.module';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule.forRootAsync({
      inject: [TypedConfigService],
      useFactory: (cfg: TypedConfigService) => ({
        pinoHttp: {
          level: cfg.get('LOG_LEVEL'),
          transport: cfg.isDev
            ? {
                target: 'pino-pretty',
                options: { singleLine: true, colorize: true, translateTime: 'HH:MM:ss' },
              }
            : undefined,
          redact: ['req.headers.authorization', 'req.headers.cookie'],
        },
      }),
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 60 }],
    }),
    PrismaModule,
    NotificationsModule,
    HealthModule,
    AuthModule,
    UsersModule,
    PlansModule,
    ContactModule,
    UsageModule,
    CategoriesModule,
    ToolsModule,
    BlogModule,
    SettingsModule,
    SubscriptionsModule,
    PaymentsModule,
    AdminModule,
    PremiumModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
