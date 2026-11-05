import { Body, Controller, DefaultValuePipe, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ContactStatus, Role } from '@prisma/client';
import type { Request } from 'express';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactStatusDto } from './dto/update-contact-status.dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async submit(@Body() dto: CreateContactDto, @Req() req: Request) {
    const { id } = await this.contact.create({
      name: dto.name,
      email: dto.email,
      subject: dto.subject,
      message: dto.message,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { id, message: 'Message received. We will reply shortly.' };
  }

  // ---- admin ----

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Get()
  async list(
    @Query('status') status: ContactStatus | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.contact.list({ status, page, pageSize });
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id')
  async updateStatus(
    @CurrentUser() current: AuthenticatedUser | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateContactStatusDto,
  ) {
    if (!current) throw new UnauthorizedException();
    return { item: await this.contact.updateStatus(id, dto.status, current.id) };
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.contact.remove(id);
  }
}
