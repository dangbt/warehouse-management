import { deactivateBlocker, deleteBlocker, normalizeCode } from './warehouse-rules';

describe('warehouse-rules', () => {
  it('không xoá kho mặc định / kho còn tồn / kho có chứng từ', () => {
    expect(deleteBlocker({ isDefault: true }, { stockQty: 0, documents: 0 })).toMatch(/mặc định/);
    expect(deleteBlocker({ isDefault: false }, { stockQty: 3, documents: 0 })).toMatch(/còn tồn/);
    expect(deleteBlocker({ isDefault: false }, { stockQty: 0, documents: 2 })).toMatch(/chứng từ/);
    expect(deleteBlocker({ isDefault: false }, { stockQty: 0, documents: 0 })).toBeNull();
  });
  it('không ngừng hoạt động kho mặc định', () => {
    expect(deactivateBlocker({ isDefault: true })).not.toBeNull();
    expect(deactivateBlocker({ isDefault: false })).toBeNull();
  });
  it('chuẩn hoá mã kho', () => {
    expect(normalizeCode('  kho2 ')).toBe('KHO2');
    expect(normalizeCode(undefined)).toBe('');
  });
});
