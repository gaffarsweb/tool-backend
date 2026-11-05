import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

interface LogArgs {
  userId: string | null;
  toolSlug: string;
  success?: boolean;
  executionMs?: number;
  inputBytes?: number;
  outputBytes?: number;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(args: LogArgs): Promise<void> {
    const tool = await this.prisma.tool.findUnique({
      where: { slug: args.toolSlug },
      select: { id: true },
    });
    if (!tool) {
      // Static registry may contain tools not yet seeded in DB — silently ignore.
      this.logger.debug(`Usage ignored: tool slug "${args.toolSlug}" not found in DB`);
      return;
    }

    await this.prisma.$transaction([
      this.prisma.toolUsage.create({
        data: {
          userId: args.userId,
          toolId: tool.id,
          success: args.success ?? true,
          executionMs: args.executionMs,
          inputBytes: args.inputBytes,
          outputBytes: args.outputBytes,
          ipAddress: args.ipAddress,
          userAgent: args.userAgent?.slice(0, 500),
        },
      }),
      this.prisma.tool.update({
        where: { id: tool.id },
        data: { totalRuns: { increment: 1 } },
      }),
    ]);
  }
}
