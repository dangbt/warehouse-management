import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { InventorySummaryRawRow } from './inventory-summary';

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
}

/**
 * Query gom nhóm Nhập – Xuất – Tồn theo NL, tính hoàn toàn trong SQL (không load giao dịch vào RAM).
 *
 * Dấu SL: nhập (IMPORT, PROCESS_IN) = +|q|; xuất (EXPORT, ORDER_DEDUCT, PROCESS_OUT, RETURN) = −|q|
 * (các luồng cũ lưu dấu không đồng nhất nên lấy độ lớn); STOCKTAKE_ADJUST giữ nguyên dấu.
 * Giá trị: |total_cost| (giá vốn trên giao dịch, WMS-6); giao dịch cũ chưa có thì |total_price|, ngược lại |q| × COALESCE(unit_price, cost_per_unit).
 */
@Injectable()
export class InventorySummaryRepository {
  constructor(private prisma: PrismaService) {}

  async aggregate(from: Date, to: Date, groupId?: string): Promise<InventorySummaryRawRow[]> {
    const groupFilter = groupId ? Prisma.sql`AND i.group_id = ${groupId}` : Prisma.empty;
    const rows = await this.prisma.$queryRaw<SqlRow[]>(Prisma.sql`
      WITH t AS (
        SELECT
          st.ingredient_id,
          st.voucher_date,
          CASE
            WHEN st.type IN ('IMPORT', 'PROCESS_IN') THEN ABS(st.quantity)
            WHEN st.type IN ('EXPORT', 'ORDER_DEDUCT', 'PROCESS_OUT', 'RETURN') THEN -ABS(st.quantity)
            WHEN st.type = 'STOCKTAKE_ADJUST' THEN st.quantity
            ELSE 0
          END AS sq,
          COALESCE(ABS(st.total_cost), ABS(st.total_price), ABS(st.quantity) * COALESCE(st.unit_price, i.cost_per_unit)) AS av
        FROM stock_transactions st
        JOIN ingredients i ON i.id = st.ingredient_id
        WHERE st.voucher_date <= ${to} ${groupFilter}
      ),
      s AS (
        SELECT *, CASE WHEN sq < 0 THEN -av WHEN sq > 0 THEN av ELSE 0 END AS sv FROM t WHERE sq <> 0
      )
      SELECT
        i.id AS ingredient_id,
        UPPER(LEFT(i.id, 8)) AS code,
        i.name,
        i.unit,
        g.id AS group_id,
        g.name AS group_name,
        COALESCE(SUM(s.sq) FILTER (WHERE s.voucher_date < ${from}), 0)::float8 AS opening_qty,
        COALESCE(SUM(s.sv) FILTER (WHERE s.voucher_date < ${from}), 0)::float8 AS opening_value,
        COALESCE(SUM(s.sq) FILTER (WHERE s.voucher_date >= ${from} AND s.sq > 0), 0)::float8 AS in_qty,
        COALESCE(SUM(s.sv) FILTER (WHERE s.voucher_date >= ${from} AND s.sq > 0), 0)::float8 AS in_value,
        COALESCE(-SUM(s.sq) FILTER (WHERE s.voucher_date >= ${from} AND s.sq < 0), 0)::float8 AS out_qty,
        COALESCE(-SUM(s.sv) FILTER (WHERE s.voucher_date >= ${from} AND s.sq < 0), 0)::float8 AS out_value
      FROM s
      JOIN ingredients i ON i.id = s.ingredient_id
      LEFT JOIN ingredient_groups g ON g.id = i.group_id
      GROUP BY i.id, i.name, i.unit, g.id, g.name
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
    }));
  }
}
