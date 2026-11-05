import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { TypedConfigService } from '../../config/typed-config.service';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: TypedConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.auth.register(dto.email, dto.password, dto.name);
    return { user, message: 'Verification email sent' };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    const user = await this.auth.verifyEmail(dto.token);
    return { user };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('resend-verification')
  @HttpCode(HttpStatus.ACCEPTED)
  async resendVerification(@Body() dto: ResendVerificationDto) {
    await this.auth.resendVerification(dto.email);
    return {
      message: 'If the account exists and is unverified, a new verification email has been sent',
    };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.auth.login(dto.email, dto.password, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken, tokens.refreshTokenExpiresAt);
    return { user };
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req.cookies as Record<string, string> | undefined)?.refresh_token;
    if (!token) throw new UnauthorizedException('Missing refresh token');
    const tokens = await this.auth.refresh(token, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken, tokens.refreshTokenExpiresAt);
    return { ok: true };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req.cookies as Record<string, string> | undefined)?.refresh_token;
    await this.auth.logout(token);
    this.clearAuthCookies(res);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.requestPasswordReset(dto.email);
    return { message: 'If the account exists, a reset email has been sent' };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.password);
    return { message: 'Password has been reset. Please sign in.' };
  }

  @Get('me')
  async me(@CurrentUser() current: AuthenticatedUser | undefined) {
    if (!current) throw new UnauthorizedException();
    const user = await this.auth.getProfile(current.id);
    return { user };
  }

  // ---------- cookie helpers ----------

  private cookieOptions(expires?: Date): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get('COOKIE_SECURE'),
      sameSite: this.config.get('COOKIE_SAMESITE'),
      domain: this.config.get('COOKIE_DOMAIN'),
      path: '/',
      expires,
    };
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
    refreshExpiresAt: Date,
  ) {
    // Access cookie lifetime is left as a session cookie; the token embeds its own exp claim
    res.cookie('access_token', accessToken, this.cookieOptions());
    res.cookie('refresh_token', refreshToken, this.cookieOptions(refreshExpiresAt));
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie('access_token', this.cookieOptions());
    res.clearCookie('refresh_token', this.cookieOptions());
  }
}
