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
}

/**
 * Query gom nhóm Nhập – Xuất – Tồn theo NL, tính hoàn toàn trong SQL (không load giao dịch vào RAM).
 *
 * Phân loại nhập/xuất + giá trị: xem stock-movement-sql.ts (dùng chung với Thẻ kho).
 */
@Injectable()
export class InventorySummaryRepository {
  constructor(private prisma: PrismaService) {}

  async aggregate(from: Date, to: Date, groupId?: string, warehouseId?: string): Promise<InventorySummaryRawRow[]> {
    const groupFilter = groupId ? Prisma.sql`AND i.group_id = ${groupId}` : Prisma.empty;
    const whFilter = warehouseId ? Prisma.sql`AND st.warehouse_id = ${warehouseId}` : Prisma.empty;
    const rows = await this.prisma.$queryRaw<SqlRow[]>(Prisma.sql`
      WITH t AS (
        SELECT
          st.ingredient_id,
          st.voucher_date,
          ${SIGNED_QTY_SQL} AS sq,
          ${ABS_VALUE_SQL} AS av
        FROM stock_transactions st
        JOIN ingredients i ON i.id = st.ingredient_id
        WHERE st.voucher_date <= ${to} ${groupFilter} ${whFilter}
      ),
      s AS (
        SELECT *, ${SIGNED_VALUE_SQL} AS sv FROM t WHERE sq <> 0
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
