import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Tool } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { CreateToolDto, ToolListQuery, UpdateToolDto } from './dto/tool.dto';

@Injectable()
export class ToolsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: ToolListQuery,
    includeInactive = false,
  ): Promise<{ items: Tool[]; total: number; page: number; pageSize: number }> {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 50, 200);
    const where: Prisma.ToolWhereInput = {};
    if (!includeInactive) where.isActive = true;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.featured !== undefined) where.isFeatured = query.featured;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.tool.findMany({
        where,
        orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.tool.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async get(id: string): Promise<Tool> {
    const row = await this.prisma.tool.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Tool not found');
    return row;
  }

  async getBySlug(slug: string): Promise<Tool | null> {
    return this.prisma.tool.findUnique({ where: { slug } });
  }

  async create(dto: CreateToolDto): Promise<Tool> {
    try {
      return await this.prisma.tool.create({
        data: {
          ...dto,
          keywords: dto.keywords ?? [],
          faqsJson: dto.faqsJson as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A tool with that slug already exists');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateToolDto): Promise<Tool> {
    await this.get(id);
    return this.prisma.tool.update({
      where: { id },
      data: {
        ...dto,
        faqsJson: dto.faqsJson as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.get(id);
    await this.prisma.tool.delete({ where: { id } });
  }
}
