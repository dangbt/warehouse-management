import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // DB từ xa (Neon): timeout mặc định 5s quá ngắn cho giao dịch duyệt phiếu nhiều dòng.
    super({ transactionOptions: { maxWait: 10_000, timeout: 30_000 } });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
