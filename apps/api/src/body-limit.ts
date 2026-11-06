import type { NestExpressApplication } from '@nestjs/platform-express';

/** Giới hạn body JSON (mặc định Express 100KB không đủ cho nhập 2.000 dòng từ Excel). */
export const JSON_BODY_LIMIT = '1mb';

export function applyBodyLimit(app: NestExpressApplication): void {
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
}
