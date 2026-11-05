import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'auth:isPublic';

/**
 * Marks a route as unauthenticated — bypasses the global JwtAuthGuard.
 * Use on /auth/register, /auth/login, /health, etc.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
