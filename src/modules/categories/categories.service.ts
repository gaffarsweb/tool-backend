import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Category } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<Category[]> {
    return this.prisma.category.findMany({ orderBy: { orderIndex: 'asc' } });
  }

  async get(id: string): Promise<Category> {
    const row = await this.prisma.category.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Category not found');
    return row;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    try {
      return await this.prisma.category.create({ data: dto });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A category with that slug already exists');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    await this.get(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<void> {
    await this.get(id);
    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new ConflictException('Category has tools attached; move or delete them first');
      }
      throw err;
    }
  }
}
