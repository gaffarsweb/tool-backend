import { Injectable } from '@nestjs/common';
import { ContactStatus } from '@prisma/client';
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
}
