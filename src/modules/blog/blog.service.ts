import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BlogStatus, Prisma, type BlogCategory, type BlogPost } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { CreateBlogCategoryDto, UpdateBlogCategoryDto } from './dto/blog-category.dto';
import type { CreateBlogPostDto, UpdateBlogPostDto } from './dto/blog-post.dto';

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  // --- categories ---

  listCategories(): Promise<BlogCategory[]> {
    return this.prisma.blogCategory.findMany({ orderBy: { orderIndex: 'asc' } });
  }

  async getCategory(id: string): Promise<BlogCategory> {
    const row = await this.prisma.blogCategory.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Blog category not found');
    return row;
  }

  async createCategory(dto: CreateBlogCategoryDto): Promise<BlogCategory> {
    try {
      return await this.prisma.blogCategory.create({ data: dto });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A blog category with that slug already exists');
      }
      throw err;
    }
  }

  async updateCategory(id: string, dto: UpdateBlogCategoryDto): Promise<BlogCategory> {
    await this.getCategory(id);
    return this.prisma.blogCategory.update({ where: { id }, data: dto });
  }

  async removeCategory(id: string): Promise<void> {
    await this.getCategory(id);
    try {
      await this.prisma.blogCategory.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new ConflictException('Category has posts attached');
      }
      throw err;
    }
  }

  // --- posts ---

  async listPosts(args: {
    publishedOnly: boolean;
    categoryId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: BlogPost[]; total: number; page: number; pageSize: number }> {
    const page = args.page ?? 1;
    const pageSize = Math.min(args.pageSize ?? 20, 100);
    const where: Prisma.BlogPostWhereInput = {};
    if (args.publishedOnly) {
      where.status = BlogStatus.PUBLISHED;
      where.publishedAt = { lte: new Date() };
    }
    if (args.categoryId) where.categoryId = args.categoryId;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.blogPost.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async getPost(id: string): Promise<BlogPost> {
    const row = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Post not found');
    return row;
  }

  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    return this.prisma.blogPost.findUnique({ where: { slug } });
  }

  async createPost(authorId: string, dto: CreateBlogPostDto): Promise<BlogPost> {
    try {
      const publishedAt = dto.status === BlogStatus.PUBLISHED ? new Date() : null;
      return await this.prisma.blogPost.create({
        data: {
          ...dto,
          relatedToolIds: dto.relatedToolIds ?? [],
          status: dto.status ?? BlogStatus.DRAFT,
          authorId,
          publishedAt,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A post with that slug already exists');
      }
      throw err;
    }
  }

  async updatePost(id: string, dto: UpdateBlogPostDto): Promise<BlogPost> {
    const current = await this.getPost(id);
    let publishedAt = current.publishedAt;
    if (dto.status === BlogStatus.PUBLISHED && current.status !== BlogStatus.PUBLISHED) {
      publishedAt = new Date();
    } else if (dto.status && dto.status !== BlogStatus.PUBLISHED) {
      // Keep historical publishedAt but not re-publish
    }
    return this.prisma.blogPost.update({
      where: { id },
      data: {
        ...dto,
        publishedAt,
      },
    });
  }

  async removePost(id: string): Promise<void> {
    await this.getPost(id);
    await this.prisma.blogPost.delete({ where: { id } });
  }
}
