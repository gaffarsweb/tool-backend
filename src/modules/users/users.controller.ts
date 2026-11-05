import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
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
}
