import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';
import { PlansService } from './plans.service';

@Controller('plans')
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Public()
  @Get()
  async list() {
    const items = await this.plans.listActive();
    return { items };
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Get('admin/all')
  async listAll() {
    const items = await this.plans.listAll();
    return { items: items.map((p) => this.plans.toPublic(p)) };
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Post()
  async create(@Body() dto: CreatePlanDto) {
    const item = await this.plans.create(dto);
    return { item: this.plans.toPublic(item) };
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    const item = await this.plans.update(id, dto);
    return { item: this.plans.toPublic(item) };
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.plans.remove(id);
  }
}
