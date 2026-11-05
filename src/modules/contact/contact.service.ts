import { Injectable, NotFoundException } from '@nestjs/common';
import { ContactStatus, type ContactMessage, type Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface ContactInput {
  name: string;
  email: string;
  subject?: string;
  message: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: ContactInput): Promise<{ id: string }> {
    const row = await this.prisma.contactMessage.create({
      data: {
        name: input.name,
        email: input.email,
        subject: input.subject,
        message: input.message,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent?.slice(0, 500),
        status: ContactStatus.NEW,
      },
      select: { id: true },
    });
    return row;
  }

  async list(args: { status?: ContactStatus; page?: number; pageSize?: number }) {
    const page = args.page ?? 1;
    const pageSize = Math.min(args.pageSize ?? 20, 100);
    const where: Prisma.ContactMessageWhereInput = {};
    if (args.status) where.status = args.status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.contactMessage.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async updateStatus(id: string, status: ContactStatus, handledByUserId: string | null): Promise<ContactMessage> {
    const row = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Message not found');
    return this.prisma.contactMessage.update({
      where: { id },
      data: {
        status,
        handledByUserId,
        handledAt: status === ContactStatus.RESOLVED ? new Date() : row.handledAt,
      },
    });
  }

  async remove(id: string): Promise<void> {
    const row = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Message not found');
    await this.prisma.contactMessage.delete({ where: { id } });
  }
}
