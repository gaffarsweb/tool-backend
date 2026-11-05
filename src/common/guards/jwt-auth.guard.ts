import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';
import { TypedConfigService } from '../../config/typed-config.service';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: TypedConfigService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('Missing access token');

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      });
      req.user = { id: payload.sub, email: payload.email, role: payload.role };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private extractToken(req: Request): string | null {
    // Primary: HTTP-only cookie set by /auth/login
    const cookieToken = (req.cookies as Record<string, string> | undefined)?.access_token;
    if (cookieToken) return cookieToken;

    // Fallback: Authorization header for API clients
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) return header.slice(7);

    return null;
  }
}
