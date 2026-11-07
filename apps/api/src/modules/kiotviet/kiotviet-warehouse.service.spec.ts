/* eslint-disable @typescript-eslint/require-await -- fake DB bất đồng bộ */
import { KiotVietWarehouseService } from './kiotviet-warehouse.service';

function make(value: unknown, stockResolve: (id: string | null) => Promise<string>) {
  const prisma = { appSetting: { findUnique: async () => (value === undefined ? null : { value }) } };
  return new KiotVietWarehouseService(prisma as never, { resolveId: stockResolve } as never);
}
const resolve = async (id: string | null) => {
  if (id === 'gone') throw new Error('inactive');
  return id ?? 'MAIN';
};

describe('KiotVietWarehouseService.resolveForBranch', () => {
  it('chưa cấu hình ⇒ kho chính', async () => {
    expect(await make(undefined, resolve).resolveForBranch('b1')).toBe('MAIN');
    expect(await make(undefined, resolve).resolveForBranch(null)).toBe('MAIN');
  });
  it('chi nhánh có mapping ⇒ kho đó; chi nhánh lạ ⇒ kho mặc định cấu hình', async () => {
    const svc = make({ defaultWarehouseId: 'D', branches: { b1: 'W2' } }, resolve);
    expect(await svc.resolveForBranch('b1')).toBe('W2');
    expect(await svc.resolveForBranch('zzz')).toBe('D');
  });
  it('kho đã cấu hình bị tắt/xoá ⇒ rơi về kho chính, không chặn trừ kho', async () => {
    expect(await make({ branches: { b1: 'gone' } }, resolve).resolveForBranch('b1')).toBe('MAIN');
  });
});
