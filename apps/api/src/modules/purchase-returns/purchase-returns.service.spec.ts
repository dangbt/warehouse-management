import { remainingReturnableQty } from './purchase-returns.service';

describe('remainingReturnableQty', () => {
  it('số còn được trả = số nhập − số đã trả', () => {
    expect(remainingReturnableQty(100, 0)).toBe(100);
    expect(remainingReturnableQty(100, 30)).toBe(70);
    expect(remainingReturnableQty(100, 100)).toBe(0);
  });

  it('không âm khi số đã trả vượt số nhập', () => {
    expect(remainingReturnableQty(100, 120)).toBe(0);
  });

  it('giữ đúng số lẻ đơn vị tồn', () => {
    expect(remainingReturnableQty(10.5, 2.25)).toBeCloseTo(8.25, 3);
  });
});
