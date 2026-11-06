/**
 * Fixture XML hoá đơn điện tử theo cấu trúc TT78/2021 (HDon/DLHDon/TTChung/NDHDon/NBan/DSHHDVu/TToan).
 * KHÔNG phải file thật của nhà cung cấp dịch vụ HĐĐT — tự dựng theo schema, dữ liệu giả.
 */
export interface FixtureItem {
  stt: number;
  name: string;
  unit?: string;
  qty?: number;
  price?: number;
  amount: number;
  rate: string;
  tchat?: number;
}

export function buildInvoiceXml(
  opts: {
    taxCode?: string;
    symbol?: string;
    no?: string;
    date?: string;
    items?: FixtureItem[];
    subtotal?: number;
    vat?: number;
    total?: number;
    prolog?: string;
  } = {},
): string {
  const items = opts.items ?? MULTI_RATE_ITEMS;
  const rows = items
    .map(
      (i) => `
        <HHDVu>
          <TChat>${i.tchat ?? 1}</TChat>
          <STT>${i.stt}</STT>
          <THHDVu>${i.name}</THHDVu>
          ${i.unit ? `<DVTinh>${i.unit}</DVTinh>` : ''}
          ${i.qty != null ? `<SLuong>${i.qty}</SLuong>` : ''}
          ${i.price != null ? `<DGia>${i.price}</DGia>` : ''}
          <ThTien>${i.amount}</ThTien>
          <TSuat>${i.rate}</TSuat>
        </HHDVu>`,
    )
    .join('');
  return `${opts.prolog ?? '<?xml version="1.0" encoding="UTF-8"?>'}
<HDon>
  <DLHDon Id="data">
    <TTChung>
      <PBan>2.0.0</PBan>
      <THDon>Hóa đơn giá trị gia tăng</THDon>
      <KHMSHDon>1</KHMSHDon>
      <KHHDon>${opts.symbol ?? 'C26TAA'}</KHHDon>
      <SHDon>${opts.no ?? '123'}</SHDon>
      <NLap>${opts.date ?? '2026-10-15'}</NLap>
      <DVTTe>VND</DVTTe>
    </TTChung>
    <NDHDon>
      <NBan>
        <Ten>Công ty TNHH Thực phẩm Sạch</Ten>
        <MST>${opts.taxCode ?? '0312345678'}</MST>
        <DChi>12 Lê Lợi, Quận 1, TP.HCM</DChi>
      </NBan>
      <NMua><Ten>Nhà hàng ABC</Ten><MST>0109876543</MST></NMua>
      <DSHHDVu>${rows}
      </DSHHDVu>
      <TToan>
        <TgTCThue>${opts.subtotal ?? 2500000}</TgTCThue>
        <TgTThue>${opts.vat ?? 182000}</TgTThue>
        <TgTTTBSo>${opts.total ?? 2682000}</TgTTTBSo>
      </TToan>
    </NDHDon>
  </DLHDon>
</HDon>`;
}

/** Thịt bò 8% (có chiết khấu 100.000) + rau 5%. Tổng: 2.500.000 + thuế 182.000 = 2.682.000. */
export const MULTI_RATE_ITEMS: FixtureItem[] = [
  { stt: 1, name: 'Thịt bò', unit: 'kg', qty: 10, price: 200000, amount: 2000000, rate: '8%' },
  { stt: 2, name: 'Rau muống', unit: 'kg', qty: 20, price: 30000, amount: 600000, rate: '5%' },
  { stt: 3, name: 'Chiết khấu thương mại', amount: 100000, rate: '8%', tchat: 3 },
];
