import { ConflictException } from '@nestjs/common';

export const SKU_DUPLICATE = 'SKU_DUPLICATE';
export const BARCODE_DUPLICATE = 'BARCODE_DUPLICATE';
export const PRODUCT_CODE_DUPLICATE = 'PRODUCT_CODE_DUPLICATE';
export const NAME_DUPLICATE = 'ITEM_NAME_DUPLICATE';
export const GENERIC_DUPLICATE = 'DUPLICATE';

const BY_FIELD: Record<string, [string, string]> = {
  sku: [SKU_DUPLICATE, 'SKU đã tồn tại'],
  barcode: [BARCODE_DUPLICATE, 'Barcode đã tồn tại'],
  code: [PRODUCT_CODE_DUPLICATE, 'Mã đã tồn tại'],
  name: [NAME_DUPLICATE, 'Tên đã tồn tại'],
};

/** Chuyển lỗi unique của Prisma (P2002) thành 409 kèm error code; lỗi khác ném lại nguyên. */
export function mapUniqueError(e: unknown): never {
  const err = e as { code?: string; meta?: { target?: string[] | string } };
  if (err?.code === 'P2002') {
    const t = err.meta?.target;
    const target = (Array.isArray(t) ? t.join(',') : (t ?? '')).toLowerCase();
    const field = Object.keys(BY_FIELD).find((f) => target.includes(f));
    const [code, message] = field ? BY_FIELD[field] : [GENERIC_DUPLICATE, 'Giá trị bị trùng'];
    throw new ConflictException({ statusCode: 409, code, message });
  }
  throw e;
}
