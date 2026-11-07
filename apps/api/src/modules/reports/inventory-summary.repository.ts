import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { InventorySummaryRawRow } from './inventory-summary';
import { ABS_VALUE_SQL, SIGNED_QTY_SQL, SIGNED_VALUE_SQL } from './stock-movement-sql';

interface SqlRow {
  ingredient_id: string;
  code: string;
  name: string;
  unit: string;
  group_id: string | null;
  group_name: string | null;
  opening_qty: number | null;
  opening_value: number | null;
  in_qty: number | null;
  in_value: number | null;
  out_qty: number | null;
  out_value: number | null;
  product_id: string | null;
  product_code: string | null;
  product_name: string | null;
  variant_label: string | null;
}

export interface InventorySummaryFilter {
  groupId?: string;
  /** Danh mục sản phẩm (products.category) — WMS-22. */
  category?: string;
  /** Chỉ các biến thể mang giá trị thuộc tính này (vd Size M) — WMS-22. */
  attributeValueId?: string;
}

/**
 * Query gom nhóm Nhập – Xuất – Tồn theo NL, tính hoàn toàn trong SQL (không load giao dịch vào RAM).
 *
 * Phân loại nhập/xuất + giá trị: xem stock-movement-sql.ts (dùng chung với Thẻ kho).
 */
@Injectable()
export class InventorySummaryRepository {
  constructor(private prisma: PrismaService) {}

  async aggregate(from: Date, to: Date, filter: InventorySummaryFilter = {}): Promise<InventorySummaryRawRow[]> {
    const { groupId, category, attributeValueId } = filter;
    const groupFilter = Prisma.sql`${groupId ? Prisma.sql`AND i.group_id = ${groupId}` : Prisma.empty}
      ${category ? Prisma.sql`AND i.product_id IN (SELECT id FROM products WHERE category = ${category})` : Prisma.empty}
      ${attributeValueId ? Prisma.sql`AND EXISTS (SELECT 1 FROM item_attribute_values iav WHERE iav.ingredient_id = i.id AND iav.attribute_value_id = ${attributeValueId})` : Prisma.empty}`;
    const rows = await this.prisma.$queryRaw<SqlRow[]>(Prisma.sql`
      WITH t AS (
        SELECT
          st.ingredient_id,
          st.voucher_date,
          ${SIGNED_QTY_SQL} AS sq,
          ${ABS_VALUE_SQL} AS av
        FROM stock_transactions st
        JOIN ingredients i ON i.id = st.ingredient_id
        WHERE st.voucher_date <= ${to} ${groupFilter}
      ),
      s AS (
        SELECT *, ${SIGNED_VALUE_SQL} AS sv FROM t WHERE sq <> 0
      )
      SELECT
        i.id AS ingredient_id,
        COALESCE(i.sku, UPPER(LEFT(i.id, 8))) AS code,
        i.name,
        i.unit,
        g.id AS group_id,
        g.name AS group_name,
        p.id AS product_id,
        p.code AS product_code,
        p.name AS product_name,
        (SELECT string_agg(av.value, ' / ' ORDER BY pa.sort, pa.code)
           FROM item_attribute_values iav
           JOIN attribute_values av ON av.id = iav.attribute_value_id
           JOIN product_attributes pa ON pa.id = iav.attribute_id
          WHERE iav.ingredient_id = i.id) AS variant_label,
        COALESCE(SUM(s.sq) FILTER (WHERE s.voucher_date < ${from}), 0)::float8 AS opening_qty,
        COALESCE(SUM(s.sv) FILTER (WHERE s.voucher_date < ${from}), 0)::float8 AS opening_value,
        COALESCE(SUM(s.sq) FILTER (WHERE s.voucher_date >= ${from} AND s.sq > 0), 0)::float8 AS in_qty,
        COALESCE(SUM(s.sv) FILTER (WHERE s.voucher_date >= ${from} AND s.sq > 0), 0)::float8 AS in_value,
        COALESCE(-SUM(s.sq) FILTER (WHERE s.voucher_date >= ${from} AND s.sq < 0), 0)::float8 AS out_qty,
        COALESCE(-SUM(s.sv) FILTER (WHERE s.voucher_date >= ${from} AND s.sq < 0), 0)::float8 AS out_value
      FROM s
      JOIN ingredients i ON i.id = s.ingredient_id
      LEFT JOIN ingredient_groups g ON g.id = i.group_id
      LEFT JOIN products p ON p.id = i.product_id
      GROUP BY i.id, i.name, i.unit, i.sku, g.id, g.name, p.id, p.code, p.name
      HAVING COUNT(*) > 0
    `);
    return rows.map((r) => ({
      ingredientId: r.ingredient_id,
      code: r.code,
      name: r.name,
      unit: r.unit,
      groupId: r.group_id,
      groupName: r.group_name,
      openingQty: Number(r.opening_qty ?? 0),
      openingValue: Number(r.opening_value ?? 0),
      inQty: Number(r.in_qty ?? 0),
      inValue: Number(r.in_value ?? 0),
      outQty: Number(r.out_qty ?? 0),
      outValue: Number(r.out_value ?? 0),
      productId: r.product_id,
      productCode: r.product_code,
      productName: r.product_name,
      variantLabel: r.variant_label,
    }));
  }
}
