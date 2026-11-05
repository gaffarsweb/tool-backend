import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  async me(@CurrentUser() current: AuthenticatedUser | undefined) {
    if (!current) throw new UnauthorizedException();
    return { user: await this.users.getById(current.id) };
  }

  @Patch('me')
  async updateMe(@CurrentUser() current: AuthenticatedUser | undefined, @Body() dto: UpdateMeDto) {
    if (!current) throw new UnauthorizedException();
    return { user: await this.users.updateMe(current.id, dto) };
  }

  // ---------- admin-only ----------

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Get()
  async list(
    @Query('search') search: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    const take = Math.min(pageSize, 100);
    const skip = (page - 1) * take;
    const { items, total } = await this.users.listPaginated({ skip, take, search });
    return { items, total, page, pageSize: take };
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Get(':id')
  async get(@Param('id') id: string) {
    return { user: await this.users.getById(id) };
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id')
  async adminUpdate(
    @CurrentUser() current: AuthenticatedUser | undefined,
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    if (current?.id === id && dto.role === Role.USER) {
      throw new ForbiddenException('Cannot demote your own admin account');
    }
    return { user: await this.users.adminUpdate(id, dto) };
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() current: AuthenticatedUser | undefined, @Param('id') id: string) {
    if (current?.id === id) throw new ForbiddenException('Cannot delete your own account');
    await this.users.remove(id);
  }
}
