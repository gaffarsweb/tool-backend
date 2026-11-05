import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Public()
  @Get('public')
  async getPublic() {
    return { item: await this.settings.getPublic() };
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Get()
  async getAll() {
    return { item: await this.settings.getSingleton() };
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Patch()
  async update(@Body() dto: UpdateSettingsDto) {
    return { item: await this.settings.update(dto) };
  }
}
