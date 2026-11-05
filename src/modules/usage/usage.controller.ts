import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { JwtService } from '@nestjs/jwt';
import { TypedConfigService } from '../../config/typed-config.service';
import { LogUsageDto } from './dto/log-usage.dto';
import { UsageService } from './usage.service';

@Controller('usage')
export class UsageController {
  constructor(
    private readonly usage: UsageService,
    private readonly jwt: JwtService,
    private readonly config: TypedConfigService,
  ) {}

  // Public so anonymous users can log usage. We try to read the access cookie
  // ourselves (the global JwtAuthGuard is bypassed by @Public) so logged-in
  // users still get attributed.
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async log(
    @Body() dto: LogUsageDto,
    @CurrentUser() _ignored: AuthenticatedUser | undefined,
    @Req() req: Request,
  ) {
    const userId = this.tryResolveUser(req);
    await this.usage.log({
      userId,
      toolSlug: dto.toolSlug,
      success: dto.success,
      executionMs: dto.executionMs,
      inputBytes: dto.inputBytes,
      outputBytes: dto.outputBytes,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { ok: true };
  }

  private tryResolveUser(req: Request): string | null {
    const token = (req.cookies as Record<string, string> | undefined)?.access_token;
    if (!token) return null;
    try {
      const payload = this.jwt.verify<{ sub: string }>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      });
      return payload.sub;
    } catch {
      return null;
    }
  }
}
