import { Injectable } from '@nestjs/common';
import { BlogStatus, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface DashboardKpis {
  totals: {
    users: number;
    tools: number;
    categories: number;
    blogPosts: number;
    activeSubscriptions: number;
    newContactMessages: number;
    toolRunsLast30d: number;
  };
  topTools: { slug: string; name: string; runs: number }[];
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(): Promise<DashboardKpis> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [users, tools, categories, blogPosts, activeSubs, contacts, toolRuns, topTools] =
      await this.prisma.$transaction([
        this.prisma.user.count(),
        this.prisma.tool.count(),
        this.prisma.category.count(),
        this.prisma.blogPost.count({ where: { status: BlogStatus.PUBLISHED } }),
        this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
        this.prisma.contactMessage.count({ where: { status: 'NEW' } }),
        this.prisma.toolUsage.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        this.prisma.tool.findMany({
          select: { slug: true, name: true, totalRuns: true },
          orderBy: { totalRuns: 'desc' },
          take: 5,
        }),
      ]);

    return {
      totals: {
        users,
        tools,
        categories,
        blogPosts,
        activeSubscriptions: activeSubs,
        newContactMessages: contacts,
        toolRunsLast30d: toolRuns,
      },
      topTools: topTools.map((t) => ({ slug: t.slug, name: t.name, runs: t.totalRuns })),
    };
  }
}
