import { Body, Controller, DefaultValuePipe, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BlogService } from './blog.service';
import { CreateBlogCategoryDto, UpdateBlogCategoryDto } from './dto/blog-category.dto';
import { CreateBlogPostDto, UpdateBlogPostDto } from './dto/blog-post.dto';

@Controller('blog')
export class BlogController {
  constructor(private readonly blog: BlogService) {}

  // ---- categories ----

  @Public()
  @Get('categories')
  async listCategories() {
    const items = await this.blog.listCategories();
    return { items };
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Post('categories')
  async createCategory(@Body() dto: CreateBlogCategoryDto) {
    return { item: await this.blog.createCategory(dto) };
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Patch('categories/:id')
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateBlogCategoryDto) {
    return { item: await this.blog.updateCategory(id, dto) };
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCategory(@Param('id') id: string) {
    await this.blog.removeCategory(id);
  }

  // ---- posts ----

  @Public()
  @Get('posts')
  async listPosts(
    @Query('categoryId') categoryId: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.blog.listPosts({ publishedOnly: true, categoryId, page, pageSize });
  }

  @Public()
  @Get('posts/slug/:slug')
  async bySlug(@Param('slug') slug: string) {
    return { item: await this.blog.getPostBySlug(slug) };
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Get('admin/posts')
  async listAllPosts(
    @Query('categoryId') categoryId: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.blog.listPosts({ publishedOnly: false, categoryId, page, pageSize });
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Post('posts')
  async createPost(
    @CurrentUser() current: AuthenticatedUser | undefined,
    @Body() dto: CreateBlogPostDto,
  ) {
    if (!current) throw new UnauthorizedException();
    return { item: await this.blog.createPost(current.id, dto) };
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Patch('posts/:id')
  async updatePost(@Param('id') id: string, @Body() dto: UpdateBlogPostDto) {
    return { item: await this.blog.updatePost(id, dto) };
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Delete('posts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePost(@Param('id') id: string) {
    await this.blog.removePost(id);
  }
}
