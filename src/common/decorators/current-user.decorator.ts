import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

/**
 * Pulls the authenticated user off `req.user`, which the `JwtAuthGuard` populates.
 * Returns `undefined` on public routes.
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
  return req.user;
});
