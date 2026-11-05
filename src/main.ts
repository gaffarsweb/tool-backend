import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { TypedConfigService } from './config/typed-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  const cfg = app.get(TypedConfigService);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.use(cookieParser());

  app.enableCors({
    origin: cfg.get('CORS_ORIGINS'),
    credentials: true,
  });

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1', prefix: false });
  app.setGlobalPrefix('api', { exclude: ['health'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableShutdownHooks();

  const port = cfg.get('PORT');
  await app.listen(port);
  app.get(Logger).log(`API listening on http://localhost:${port}  (env=${cfg.get('NODE_ENV')})`);
}

void bootstrap();
