import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface PublicProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  professionalRole: string | null;
  timezone: string | null;
  role: 'USER' | 'ADMIN';
  emailVerifiedAt: Date | null;
  deactivatedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string): Promise<PublicProfile> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.toPublic(user);
  }

  async updateMe(id: string, data: Prisma.UserUpdateInput): Promise<PublicProfile> {
    const user = await this.prisma.user.update({ where: { id }, data });
    return this.toPublic(user);
  }

  async listPaginated(args: {
    skip: number;
    take: number;
    search?: string;
  }): Promise<{ items: PublicProfile[]; total: number }> {
    const where: Prisma.UserWhereInput = args.search
      ? {
          OR: [
            { email: { contains: args.search, mode: 'insensitive' } },
            { name: { contains: args.search, mode: 'insensitive' } },
          ],
        }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: args.skip,
        take: args.take,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items: items.map((u) => this.toPublic(u)), total };
  }

  private toPublic(user: User): PublicProfile {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      professionalRole: user.professionalRole,
      timezone: user.timezone,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt,
      deactivatedAt: user.deactivatedAt,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}
