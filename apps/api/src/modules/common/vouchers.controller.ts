import { Controller, Get, Put, Param, Query, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { VoucherService } from './voucher.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('vouchers')
export class VouchersController {
  constructor(private vouchers: VoucherService) {}

  /** Số chứng từ tiếp theo theo tiền tố cấu hình, để prefill form. */
  @Get('next-no')
  async nextNo(@Query('type') type: string) {
    if (!this.vouchers.isValidType(type)) throw new BadRequestException('Loại chứng từ không hợp lệ');
    return { type, voucherNo: await this.vouchers.nextNo(type) };
  }

  @Get('config')
  config() {
    return this.vouchers.getConfigs();
  }

  @Put('config/:type')
  @RequirePermissions('tax:manage')
  updateConfig(@Param('type') type: string, @Body() body: { prefix?: string; digits?: number }) {
    return this.vouchers.updateConfig(type, body);
  }
}
