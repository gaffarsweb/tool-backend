import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Public()
  @Get()
  async list() {
    const items = await this.categories.list();
    return { items };
  }

  @Public()
  @Get(':id')
  async get(@Param('id') id: string) {
    return { item: await this.categories.get(id) };
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Post()
  async create(@Body() dto: CreateCategoryDto) {
    return { item: await this.categories.create(dto) };
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return { item: await this.categories.update(id, dto) };
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.categories.remove(id);
  }
}
