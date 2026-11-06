import {
  roundUpToBuyUnit,
  suggestQuantity,
  pickLastPurchase,
  computePoStatus,
  remainingQty,
  groupBySupplier,
  addReceipt,
  removeReceipt,
} from './purchase-logic';

describe('purchase-logic', () => {
  it('làm tròn lên theo bội số ĐVT mua', () => {
    expect(roundUpToBuyUnit(30, 24)).toBe(48);
    expect(roundUpToBuyUnit(24, 24)).toBe(24);
    expect(roundUpToBuyUnit(2.4, 0.8)).toBe(2.4);
    expect(roundUpToBuyUnit(7.2, 1)).toBe(8);
    expect(roundUpToBuyUnit(0, 24)).toBe(0);
  });

  it('SL gợi ý = minStock × hệ số − tồn, làm tròn theo ĐVT mua', () => {
    // min 10, hệ số 2, tồn 4 ⇒ 16 ⇒ thùng 12 ⇒ 24
    expect(suggestQuantity(10, 4, 2, 12)).toBe(24);
    expect(suggestQuantity(10, 4, 2, 1)).toBe(16);
    expect(suggestQuantity(10, 4, 3, 1)).toBe(26);
  });

  it('không gợi ý khi tồn >= minStock', () => {
    expect(suggestQuantity(10, 10, 2, 1)).toBe(0);
    expect(suggestQuantity(10, 15, 2, 1)).toBe(0);
  });

  it('NCC/giá gợi ý lấy lần nhập gần nhất', () => {
    const last = pickLastPurchase([
      { supplierId: 'A', unitPrice: 100, at: 1 },
      { supplierId: 'B', unitPrice: 120, at: 3 },
      { supplierId: 'C', unitPrice: 90, at: 2 },
    ]);
    expect(last).toEqual({ supplierId: 'B', unitPrice: 120, at: 3 });
    expect(pickLastPurchase([])).toBeNull();
  });

  it('trạng thái PO theo SL đã nhận', () => {
    expect(computePoStatus([{ quantity: 10, receivedQty: 0 }])).toBe('UNRECEIVED');
    expect(
      computePoStatus([
        { quantity: 10, receivedQty: 4 },
        { quantity: 5, receivedQty: 5 },
      ]),
    ).toBe('PARTIAL');
    expect(
      computePoStatus([
        { quantity: 10, receivedQty: 10 },
        { quantity: 5, receivedQty: 6 },
      ]),
    ).toBe('RECEIVED');
  });

  it('SL còn lại không âm', () => {
    expect(remainingQty(10, 4)).toBe(6);
    expect(remainingQty(10, 12)).toBe(0);
  });

  it('tách theo NCC, dòng thiếu NCC trả riêng', () => {
    const { groups, missing } = groupBySupplier([
      { supplierId: 'A', n: 1 },
      { supplierId: 'B', n: 2 },
      { supplierId: 'A', n: 3 },
      { supplierId: null, n: 4 },
    ]);
    expect(groups.get('A')?.map((x) => x.n)).toEqual([1, 3]);
    expect(groups.get('B')?.length).toBe(1);
    expect(missing).toHaveLength(1);
  });
});

describe('nhận nhiều lần (float) & đảo receipt', () => {
  const po = [{ id: 'a', ingredientId: 'x', quantity: 0.8, receivedQty: 0 }];
  it('đặt 0.8, nhận 0.7 rồi 0.1 → RECEIVED', () => {
    const l = addReceipt(addReceipt(po, [{ ingredientId: 'x', quantity: 0.7 }]), [{ ingredientId: 'x', quantity: 0.1 }]);
    expect(l[0].receivedQty).toBe(0.8);
    expect(computePoStatus(l)).toBe('RECEIVED');
  });
  it('mọi cặp SL 1 chữ số thập phân đều ra RECEIVED khi nhận đủ', () => {
    for (let a = 1; a <= 99; a++)
      for (let b = 1; b <= 99; b++) {
        const q = (a + b) / 10;
        const l = addReceipt(
          addReceipt([{ id: 'a', ingredientId: 'x', quantity: q, receivedQty: 0 }], [{ ingredientId: 'x', quantity: a / 10 }]),
          [{ ingredientId: 'x', quantity: b / 10 }],
        );
        expect(computePoStatus(l)).toBe('RECEIVED');
      }
  });
  it('bỏ ghi phiếu trả lại SL còn lại, không âm, tính lại trạng thái', () => {
    const full = addReceipt(po, [{ ingredientId: 'x', quantity: 0.8 }]);
    const back = removeReceipt(full, [{ ingredientId: 'x', quantity: 0.1 }]);
    expect(back[0].receivedQty).toBe(0.7);
    expect(remainingQty(back[0].quantity, back[0].receivedQty)).toBe(0.1);
    expect(computePoStatus(back)).toBe('PARTIAL');
    const zero = removeReceipt(back, [{ ingredientId: 'x', quantity: 5 }]);
    expect(zero[0].receivedQty).toBe(0);
    expect(computePoStatus(zero)).toBe('UNRECEIVED');
  });
});
