import { Body, Controller, ForbiddenException, Get, Headers, Post } from '@nestjs/common';
import * as crypto from 'crypto';
import { SetupService } from './setup.service';
import type { SetupDto } from './setup.service';

/** Constant-time so sánh hai chuỗi (tránh timing attack). */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Vẫn chạy timingSafeEqual để giữ thời gian ổn định
    crypto.timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Công khai nhưng tự khoá sau khi có user đầu tiên. */
@Controller('setup')
export class SetupController {
  constructor(private svc: SetupService) {}

  @Get('status')
  async status() {
    return {
      needsSetup: await this.svc.needsSetup(),
      requiresToken: !!process.env.SETUP_TOKEN,
    };
  }

  @Post()
  run(@Body() body: SetupDto, @Headers('x-setup-token') token?: string) {
    const expected = process.env.SETUP_TOKEN;
    if (expected) {
      if (!token || !safeEqual(token, expected)) {
        throw new ForbiddenException('Mã cài đặt không đúng');
      }
    }
    return this.svc.run(body);
  }
}
