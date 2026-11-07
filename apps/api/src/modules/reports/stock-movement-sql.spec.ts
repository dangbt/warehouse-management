import { Prisma } from '@prisma/client';
import { SIGNED_QTY_SQL, signedQtySql } from './stock-movement-sql';

const text = (s: Prisma.Sql) => s.sql;

describe('signedQtySql — chuyển kho (WMS-12)', () => {
  it('toàn doanh nghiệp: TRANSFER_IN/OUT không được tính (ELSE 0) ⇒ NXT tổng không đổi', () => {
    expect(text(SIGNED_QTY_SQL)).not.toContain('TRANSFER');
    expect(text(signedQtySql(false))).not.toContain('TRANSFER');
  });

  it('theo kho: TRANSFER_IN = +|q|, TRANSFER_OUT = −|q|', () => {
    const sql = text(signedQtySql(true));
    expect(sql).toMatch(/TRANSFER_IN'\s+THEN ABS\(st\.quantity\)/);
    expect(sql).toMatch(/TRANSFER_OUT'\s+THEN -ABS\(st\.quantity\)/);
  });
});
