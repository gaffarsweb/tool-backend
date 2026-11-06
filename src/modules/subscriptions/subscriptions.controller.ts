import { Controller, DefaultValuePipe, Get, ParseIntPipe, Post, Query, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Role, SubscriptionStatus } from '@prisma/client';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subs: SubscriptionsService) {}

  @Get('me')
  async me(@CurrentUser() current: AuthenticatedUser | undefined) {
    if (!current) throw new UnauthorizedException();
    return { item: await this.subs.getForUser(current.id) };
  }

  @Post('me/cancel')
  async cancelMine(@CurrentUser() current: AuthenticatedUser | undefined) {
    if (!current) throw new UnauthorizedException();
    return { item: await this.subs.cancelAtPeriodEnd(current.id) };
  }

  // Admin read
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Get()
  async list(
    @Query('status') status: SubscriptionStatus | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.subs.list({ status, page, pageSize });
  }
}
