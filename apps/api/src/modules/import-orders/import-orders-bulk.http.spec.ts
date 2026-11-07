import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import * as supertest from 'supertest';
import { ImportOrdersController } from './import-orders.controller';
import { ImportOrdersService } from './import-orders.service';
import { ImportOrdersBulkService, BULK_MAX_ITEMS } from './import-orders-bulk.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { applyBodyLimit } from '../../body-limit';

const request = (app: any) => (supertest.default ? supertest.default(app) : supertest(app));

const payload = (rows: number) => ({
  orders: Array.from({ length: rows }, (_, i) => ({
    voucher_date: '2026-11-07',
    voucher_no: `PN-${String(i).padStart(5, '0')}`,
    supplier_id: '11111111-1111-1111-1111-111111111111',
    note: 'ghi chú dài để payload sát thực tế '.repeat(2),
    has_invoice: true,
    invoice_no: `HD${i}`,
    invoice_symbol: 'C26TAA',
    invoice_date: '2026-11-07',
    items: [
      {
        ingredient_id: '22222222-2222-2222-2222-222222222222',
        quantity: 12.5,
        factor: 1,
        unit_price: 250000,
        vat_rate: '8',
        expiry_date: '2027-01-01',
      },
    ],
  })),
});

describe('POST /import-orders/bulk qua HTTP', () => {
  let app: INestApplication;
  const bulkCreate = jest.fn().mockResolvedValue({ created: 0 });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [ImportOrdersController],
      providers: [
        { provide: ImportOrdersService, useValue: {} },
        { provide: ImportOrdersBulkService, useValue: { bulkCreate } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: (ctx: any) => ((ctx.switchToHttp().getRequest().user = { id: 'u1' }), true) })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = mod.createNestApplication<NestExpressApplication>();
    applyBodyLimit(app as NestExpressApplication);
    await app.init();
  });

  afterAll(() => app.close());

  it(`nhận payload ${BULK_MAX_ITEMS} dòng (>100KB) → 201 và service được gọi`, async () => {
    const body = payload(BULK_MAX_ITEMS);
    expect(JSON.stringify(body).length).toBeGreaterThan(100 * 1024);
    await request(app.getHttpServer()).post('/import-orders/bulk').send(body).expect(201);
    expect(bulkCreate).toHaveBeenCalledWith('u1', expect.objectContaining({ orders: expect.any(Array) }));
    expect(bulkCreate.mock.calls[0][1].orders).toHaveLength(BULK_MAX_ITEMS);
  });
});
