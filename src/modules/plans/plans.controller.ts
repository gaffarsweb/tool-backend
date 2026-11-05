import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
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
}
