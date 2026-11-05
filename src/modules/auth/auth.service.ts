import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, VerificationPurpose, type User } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { TypedConfigService } from '../../config/typed-config.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  emailVerifiedAt: Date | null;
  avatarUrl: string | null;
  createdAt: Date;
}

const VERIFY_TTL_HOURS = 24;
const RESET_TTL_MINUTES = 60;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: TypedConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------- public API ----------

  async register(email: string, password: string, name: string): Promise<PublicUser> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('An account with this email already exists');

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await this.prisma.user.create({
      data: { email, name, passwordHash },
    });

    await this.issueVerificationEmail(user);
    return this.toPublic(user);
  }

  async verifyEmail(token: string): Promise<PublicUser> {
    const tokenHash = this.hashToken(token);
    const record = await this.prisma.verificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (
      !record ||
      record.purpose !== VerificationPurpose.EMAIL_VERIFICATION ||
      record.consumedAt ||
      record.expiresAt < new Date()
    ) {
      throw new BadRequestException('Verification link is invalid or expired');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.verificationToken.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      }),
    ]);

    return this.toPublic(updated);
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerifiedAt) return; // silent — don't leak existence
    await this.issueVerificationEmail(user);
  }

  async login(
    email: string,
    password: string,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid email or password');
    if (user.deactivatedAt) throw new ForbiddenException('Account deactivated');

    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException('Invalid email or password');

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException(
        'Email not verified. Check your inbox for the verification link.',
      );
    }

    const tokens = await this.issueTokens(user, meta);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return { user: this.toPublic(user), tokens };
  }

  async refresh(
    refreshToken: string,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthTokens> {
    let payload: { sub: string; jti: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: this.hashToken(payload.jti) },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh session invalid or expired');
    }
    if (session.user.deactivatedAt) throw new ForbiddenException('Account deactivated');

    // Rotate: revoke old, issue new
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(session.user, meta);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    try {
      const payload = await this.jwt.verifyAsync<{ jti: string }>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      await this.prisma.session.updateMany({
        where: { refreshTokenHash: this.hashToken(payload.jti), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Invalid token — nothing to revoke
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.deactivatedAt) return; // silent

    const { token, hash } = this.mintToken();
    const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);
    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        purpose: VerificationPurpose.PASSWORD_RESET,
        expiresAt,
      },
    });

    const resetUrl = `${this.config.get('FRONTEND_URL')}/auth/reset-password?token=${token}`;
    await this.notifications.sendResetPassword(user.email, {
      brandName: 'OmniTools',
      recipientName: user.name,
      resetUrl,
      expiresInMinutes: RESET_TTL_MINUTES,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const record = await this.prisma.verificationToken.findUnique({ where: { tokenHash } });
    if (
      !record ||
      record.purpose !== VerificationPurpose.PASSWORD_RESET ||
      record.consumedAt ||
      record.expiresAt < new Date()
    ) {
      throw new BadRequestException('Reset link is invalid or expired');
    }

    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.verificationToken.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      }),
      // Revoke all existing sessions after a password reset
      this.prisma.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.toPublic(user);
  }

  // ---------- private helpers ----------

  private async issueVerificationEmail(user: User): Promise<void> {
    const { token, hash } = this.mintToken();
    const expiresAt = new Date(Date.now() + VERIFY_TTL_HOURS * 60 * 60 * 1000);
    try {
      await this.prisma.verificationToken.create({
        data: {
          userId: user.id,
          tokenHash: hash,
          purpose: VerificationPurpose.EMAIL_VERIFICATION,
          expiresAt,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // Collision on hash is astronomically unlikely but swallow and retry once
        return this.issueVerificationEmail(user);
      }
      throw err;
    }

    const verifyUrl = `${this.config.get('FRONTEND_URL')}/auth/verify-email?token=${token}`;
    await this.notifications.sendVerifyEmail(user.email, {
      brandName: 'OmniTools',
      recipientName: user.name,
      verifyUrl,
      expiresInHours: VERIFY_TTL_HOURS,
    });
  }

  private async issueTokens(
    user: User,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_TTL'),
      },
    );

    const jti = randomBytes(32).toString('hex');
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_TTL'),
      },
    );

    const expiresAt = this.parseTtl(this.config.get('JWT_REFRESH_TTL'));
    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: this.hashToken(jti),
        userAgent: meta.userAgent?.slice(0, 500),
        ipAddress: meta.ipAddress,
        expiresAt,
      },
    });

    return { accessToken, refreshToken, refreshTokenExpiresAt: expiresAt };
  }

  private parseTtl(ttl: string): Date {
    const match = ttl.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error(`Invalid TTL: ${ttl}`);
    const n = Number(match[1]);
    const unit = match[2];
    const seconds = unit === 's' ? n : unit === 'm' ? n * 60 : unit === 'h' ? n * 3600 : n * 86400;
    return new Date(Date.now() + seconds * 1000);
  }

  private mintToken(): { token: string; hash: string } {
    const token = randomBytes(32).toString('hex');
    return { token, hash: this.hashToken(token) };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private toPublic(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  }
}
