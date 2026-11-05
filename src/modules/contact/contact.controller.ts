import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async submit(@Body() dto: CreateContactDto, @Req() req: Request) {
    // Honeypot is validated by the DTO (@MaxLength(0)) — reach here means clean.
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
}
