import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateToolDto, ToolListQuery, UpdateToolDto } from './dto/tool.dto';
import { ToolsService } from './tools.service';

@Controller('tools')
export class ToolsController {
  constructor(private readonly tools: ToolsService) {}

  @Public()
  @Get()
  async list(@Query() query: ToolListQuery) {
    return this.tools.list(query, false);
  }

  @Public()
  @Get(':slug')
  async bySlug(@Param('slug') slug: string) {
    const item = await this.tools.getBySlug(slug);
    return { item };
  }

  // Admin writes

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Get('admin/all')
  async listAll(@Query() query: ToolListQuery) {
    return this.tools.list(query, true);
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Post()
  async create(@Body() dto: CreateToolDto) {
    return { item: await this.tools.create(dto) };
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateToolDto) {
    return { item: await this.tools.update(id, dto) };
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.tools.remove(id);
  }
}
