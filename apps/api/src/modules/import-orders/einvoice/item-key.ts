/** Chuẩn hoá để so khớp: bỏ dấu, hạ chữ, gọn khoảng trắng (khớp normalizeKey phía web). */
export function normalizeKey(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
}
