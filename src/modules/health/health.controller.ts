import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

interface HealthReport {
  status: 'ok' | 'degraded';
  uptimeSeconds: number;
  version: string;
  node: string;
  env: string;
  checks: {
    database: 'ok' | 'down';
  };
}

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async health(): Promise<HealthReport> {
    let database: 'ok' | 'down' = 'ok';
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
    } catch {
      database = 'down';
    }

    return {
      status: database === 'ok' ? 'ok' : 'degraded',
      uptimeSeconds: Math.round(process.uptime()),
      version: process.env.npm_package_version ?? '0.1.0',
      node: process.version,
      env: process.env.NODE_ENV ?? 'development',
      checks: { database },
    };
  }
}
