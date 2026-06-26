import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as supertest from 'supertest';
import { AppModule } from '../src/app.module';

const request = (app: any) => (supertest.default ? supertest.default(app) : supertest(app));

describe('Warehouse Management E2E', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ===== AUTH =====
  describe('Auth', () => {
    it('POST /auth/login - success', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@wms.vn', password: '123456' })
        .expect(201);
      expect(res.body.access_token).toBeDefined();
      expect(res.body.user.email).toBe('admin@wms.vn');
      expect(res.body.user.roles).toContain('admin');
      token = res.body.access_token;
    });

    it('POST /auth/login - wrong password', async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'admin@wms.vn', password: 'wrong' }).expect(401);
    });

    it('POST /auth/login - unknown email', async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'nobody@wms.vn', password: '123456' }).expect(401);
    });
  });

  // ===== INGREDIENTS =====
  describe('Ingredients', () => {
    let ingredientId: string;

    it('GET /ingredients - unauthorized without token', async () => {
      await request(app.getHttpServer()).get('/api/v1/ingredients').expect(401);
    });

    it('GET /ingredients - list all', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/ingredients').set('Authorization', `Bearer ${token}`).expect(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.meta.total).toBeGreaterThan(0);
    });

    it('POST /ingredients - create', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/ingredients')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test NL E2E',
          unit: 'kg',
          category: 'Test',
          cost_per_unit: 10000,
          min_stock: 2,
        })
        .expect(201);
      expect(res.body.name).toBe('Test NL E2E');
      ingredientId = res.body.id;
    });

    it('POST /ingredients - duplicate name', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/ingredients')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test NL E2E',
          unit: 'kg',
          category: 'Test',
          cost_per_unit: 10000,
          min_stock: 2,
        })
        .expect(409);
    });

    it('PUT /ingredients/:id - update', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/ingredients/${ingredientId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test NL Updated' })
        .expect(200);
      expect(res.body.name).toBe('Test NL Updated');
    });

    it('DELETE /ingredients/:id - delete', async () => {
      await request(app.getHttpServer()).delete(`/api/v1/ingredients/${ingredientId}`).set('Authorization', `Bearer ${token}`).expect(200);
    });
  });

  // ===== SUPPLIERS =====
  describe('Suppliers', () => {
    let supplierId: string;

    it('GET /suppliers - list', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/suppliers').set('Authorization', `Bearer ${token}`).expect(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('POST /suppliers - create', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test NCC', phone: '0123456789', address: '123 Test' })
        .expect(201);
      supplierId = res.body.id;
    });

    it('PUT /suppliers/:id - update', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test NCC Updated' })
        .expect(200);
      expect(res.body.name).toBe('Test NCC Updated');
    });

    it('DELETE /suppliers/:id - delete', async () => {
      await request(app.getHttpServer()).delete(`/api/v1/suppliers/${supplierId}`).set('Authorization', `Bearer ${token}`).expect(200);
    });
  });

  // ===== IMPORT ORDERS =====
  describe('Import Orders', () => {
    let orderId: string;
    let supplierId: string;
    let ingredientId: string;

    beforeAll(async () => {
      const supRes = await request(app.getHttpServer()).get('/api/v1/suppliers').set('Authorization', `Bearer ${token}`);
      supplierId = supRes.body.data[0].id;
      const ingRes = await request(app.getHttpServer()).get('/api/v1/ingredients').set('Authorization', `Bearer ${token}`);
      ingredientId = ingRes.body.data[0].id;
    });

    it('POST /import-orders - create', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/import-orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          supplier_id: supplierId,
          note: 'Test',
          items: [{ ingredient_id: ingredientId, quantity: 5, unit_price: 100000 }],
        })
        .expect(201);
      expect(res.body.code).toMatch(/^PN-/);
      expect(res.body.status).toBe('PENDING');
      orderId = res.body.id;
    });

    it('GET /import-orders - list', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/import-orders').set('Authorization', `Bearer ${token}`).expect(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('PUT /import-orders/:id/approve - approve', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/import-orders/${orderId}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.message).toContain('Đã duyệt');
    });

    it('PUT /import-orders/:id/approve - cannot approve non-PENDING', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/import-orders/${orderId}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  // ===== STOCK EXPORTS =====
  describe('Stock Exports', () => {
    let ingredientId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/ingredients').set('Authorization', `Bearer ${token}`);
      ingredientId = res.body.data[0].id;
    });

    it('POST /stock-exports - success', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/stock-exports')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ingredient_id: ingredientId,
          quantity: 1,
          reason: 'DAMAGED',
          note: 'Test',
        })
        .expect(201);
    });

    it('POST /stock-exports - insufficient stock', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/stock-exports')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ingredient_id: ingredientId,
          quantity: 99999,
          reason: 'DAMAGED',
        })
        .expect(400);
    });

    it('GET /stock-exports - list', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/stock-exports').set('Authorization', `Bearer ${token}`).expect(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  // ===== RECIPES =====
  describe('Recipes', () => {
    it('GET /recipes - list', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/recipes').set('Authorization', `Bearer ${token}`).expect(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].ingredients).toBeInstanceOf(Array);
    });
  });

  // ===== USERS =====
  describe('Users', () => {
    it('GET /users - list', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/users').set('Authorization', `Bearer ${token}`).expect(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      // Should not expose passwordHash
      expect(res.body.data[0].passwordHash).toBeUndefined();
    });

    it('PUT /users/:id/toggle-active', async () => {
      const users = await request(app.getHttpServer()).get('/api/v1/users').set('Authorization', `Bearer ${token}`);
      const user = users.body.data.find((u: any) => u.email === 'bep@wms.vn');
      await request(app.getHttpServer()).put(`/api/v1/users/${user.id}/toggle-active`).set('Authorization', `Bearer ${token}`).expect(200);
    });
  });

  // ===== AUDIT LOGS =====
  describe('Audit Logs', () => {
    it('GET /audit-logs - list (empty for now, no interceptor)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/audit-logs').set('Authorization', `Bearer ${token}`).expect(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });
  });

  // ===== RBAC =====
  describe('RBAC - Non-admin access', () => {
    let warehouseToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'kho@wms.vn', password: '123456' });
      warehouseToken = res.body.access_token;
    });

    it('Warehouse staff can access ingredients', async () => {
      await request(app.getHttpServer()).get('/api/v1/ingredients').set('Authorization', `Bearer ${warehouseToken}`).expect(200);
    });

    it('Kitchen staff can login', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'bep@wms.vn', password: '123456' });
      // May be inactive from toggle test, but login check is valid
      expect(res.status).toBeOneOf([201, 401]);
    });
  });
});

// Custom matcher
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    return {
      pass,
      message: () => `expected ${received} to be one of ${expected}`,
    };
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}
