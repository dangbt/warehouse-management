import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { StockCardOpening, StockCardRawTx, StockDocType } from './stock-card';
import { ABS_VALUE_SQL, SIGNED_QTY_SQL, SIGNED_VALUE_SQL } from './stock-movement-sql';

interface TxSqlRow {
  id: string;
  voucher_date: Date;
  type: string;
  sq: number;
  sv: number;
  voucher_no: string | null;
  doc_type: StockDocType | null;
  doc_id: string | null;
  note: string | null;
}

interface OpeningSqlRow {
  qty: number | null;
  value: number | null;
}

/** Query thẻ kho của 1 NL; phân loại nhập/xuất dùng chung với báo cáo NXT (stock-movement-sql.ts). */
@Injectable()
export class StockCardRepository {
  constructor(private prisma: PrismaService) {}

  findIngredient(id: string) {
    return this.prisma.ingredient.findUnique({ where: { id }, select: { id: true, name: true, unit: true } });
  }

  private signed(ingredientId: string, extra: Prisma.Sql) {
    return Prisma.sql`
      SELECT st.id, st.voucher_date, st.created_at, st.type, st.note, st.reference_id, st.export_id,
        ${SIGNED_QTY_SQL} AS sq, ${ABS_VALUE_SQL} AS av
      FROM stock_transactions st
      JOIN ingredients i ON i.id = st.ingredient_id
      WHERE st.ingredient_id = ${ingredientId} ${extra}`;
  }

  async opening(ingredientId: string, from: Date): Promise<StockCardOpening> {
    const rows = await this.prisma.$queryRaw<OpeningSqlRow[]>(Prisma.sql`
      WITH t AS (${this.signed(ingredientId, Prisma.sql`AND st.voucher_date < ${from}`)})
      SELECT COALESCE(SUM(sq), 0)::float8 AS qty, COALESCE(SUM(${SIGNED_VALUE_SQL}), 0)::float8 AS value
      FROM t WHERE sq <> 0`);
    return { qty: Number(rows[0]?.qty ?? 0), value: Number(rows[0]?.value ?? 0) };
  }

  async transactions(ingredientId: string, from: Date, to: Date): Promise<StockCardRawTx[]> {
    const rows = await this.prisma.$queryRaw<TxSqlRow[]>(Prisma.sql`
      WITH t AS (${this.signed(ingredientId, Prisma.sql`AND st.voucher_date >= ${from} AND st.voucher_date <= ${to}`)})
      SELECT t.id, t.voucher_date, t.type, t.note, t.sq::float8 AS sq, (${SIGNED_VALUE_SQL})::float8 AS sv,
        CASE
          WHEN t.type = 'IMPORT' THEN io.voucher_no
          WHEN t.type = 'EXPORT' THEN se.voucher_no
          WHEN t.type = 'RETURN' THEN pr.voucher_no
          WHEN t.type = 'STOCKTAKE_ADJUST' THEN ss.voucher_no
          WHEN t.type IN ('PROCESS_IN', 'PROCESS_OUT') THEN po.voucher_no
        END AS voucher_no,
        CASE
          WHEN io.id IS NOT NULL THEN 'IMPORT_ORDER'
          WHEN se.id IS NOT NULL THEN 'STOCK_EXPORT'
          WHEN pr.id IS NOT NULL THEN 'PURCHASE_RETURN'
          WHEN ss.id IS NOT NULL THEN 'STOCKTAKE'
          WHEN po.id IS NOT NULL THEN 'PROCESSING'
        END AS doc_type,
        COALESCE(io.id, se.id, pr.id, ss.id, po.id) AS doc_id
      FROM t
      LEFT JOIN import_orders io ON t.type = 'IMPORT' AND io.id = t.reference_id
      LEFT JOIN stock_exports se ON t.type = 'EXPORT' AND se.id = t.export_id
      LEFT JOIN purchase_returns pr ON t.type = 'RETURN' AND pr.id = t.reference_id
      LEFT JOIN stocktake_sessions ss ON t.type = 'STOCKTAKE_ADJUST' AND ss.id = t.reference_id
      LEFT JOIN processing_orders po ON t.type IN ('PROCESS_IN', 'PROCESS_OUT') AND po.code = t.reference_id
      WHERE t.sq <> 0
      ORDER BY t.voucher_date, t.created_at, t.id`);
    return rows.map((r) => ({
      id: r.id,
      voucherDate: new Date(r.voucher_date),
      type: r.type,
      qty: Number(r.sq),
      value: Number(r.sv),
      voucherNo: r.voucher_no,
      docType: r.doc_type,
      docId: r.doc_id,
      note: r.note,
    }));
  }
}
