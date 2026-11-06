import { Body, Controller, Get, Post } from '@nestjs/common';
import { SetupService } from './setup.service';
import type { SetupDto } from './setup.service';

/** Công khai nhưng tự khoá sau khi có user đầu tiên. */
@Controller('setup')
export class SetupController {
  constructor(private svc: SetupService) {}

  @Get('status')
  async status() {
    return { needsSetup: await this.svc.needsSetup() };
  }

  @Post()
  run(@Body() body: SetupDto) {
    return this.svc.run(body);
  }
}
