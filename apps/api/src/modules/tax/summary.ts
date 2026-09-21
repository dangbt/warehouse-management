/**
 * Công thức thuần (không truy vấn DB) cho màn hình "Tổng hợp thuế kỳ".
 *
 * Tách riêng khỏi service để dễ kiểm thử đơn vị: mọi số vào là số đã tổng hợp
 * (đã làm tròn về đồng theo từng dòng ở tầng report), hàm ở đây chỉ áp công thức.
 */

import { roundVnd } from './vat';

/** Số liệu tổng hợp thuế theo chế độ VAT khấu trừ. */
export interface VatDeductionSummary {
  /** Thuế VAT đầu ra trong kỳ. */
  outputVat: number;
  /** Thuế VAT đầu vào trong kỳ (đã trừ phiếu trả hàng). */
  inputVat: number;
  /** Thuế còn được khấu trừ kỳ trước chuyển sang (≥ 0). */
  carriedForwardIn: number;
  /** Số thuế phải nộp trong kỳ: `max(0, outputVat − inputVat − carriedForwardIn)`. */
  payable: number;
  /** Thuế còn được khấu trừ chuyển sang kỳ sau: `max(0, inputVat + carriedForwardIn − outputVat)`. */
  carryToNext: number;
}

/**
 * Tính số phải nộp / kết chuyển cho chế độ VAT khấu trừ.
 *
 * - `payable = max(0, outputVat − inputVat − carriedForwardIn)`
 * - `carryToNext = max(0, inputVat + carriedForwardIn − outputVat)`
 *
 * Hai giá trị này loại trừ lẫn nhau: nếu đầu ra > đầu vào + kết chuyển thì có
 * thuế phải nộp và không kết chuyển; ngược lại thì phải nộp = 0 và có kết chuyển.
 * `carriedForwardIn` âm được kẹp về 0 (không cho phép làm tăng thuế phải nộp).
 */
export function computeVatDeduction(args: { outputVat: number; inputVat: number; carriedForwardIn: number }): VatDeductionSummary {
  const outputVat = roundVnd(args.outputVat);
  const inputVat = roundVnd(args.inputVat);
  const carriedForwardIn = Math.max(0, roundVnd(args.carriedForwardIn));

  const net = outputVat - inputVat - carriedForwardIn;
  const payable = Math.max(0, net);
  const carryToNext = Math.max(0, -net);

  return { outputVat, inputVat, carriedForwardIn, payable, carryToNext };
}

/** Số liệu tổng hợp thuế theo chế độ hộ kinh doanh (% trên doanh thu). */
export interface HouseholdSummary {
  /** Doanh thu (gross) trong kỳ. */
  revenue: number;
  /** Doanh thu luỹ kế từ đầu năm đến hết kỳ. */
  yearToDateRevenue: number;
  /** % thuế GTGT áp dụng. */
  vatPercent: number;
  /** % thuế TNCN áp dụng. */
  pitPercent: number;
  /** Ngưỡng doanh thu miễn thuế/năm. */
  exemptThreshold: number;
  /** Doanh thu luỹ kế năm ≤ ngưỡng ⇒ miễn thuế (vat/pit = 0). */
  belowExemptThreshold: boolean;
  /** Thuế GTGT: `round(revenue × vatPercent/100)`, hoặc 0 nếu dưới ngưỡng. */
  vat: number;
  /** Thuế TNCN: `round(revenue × pitPercent/100)`, hoặc 0 nếu dưới ngưỡng. */
  pit: number;
}

/**
 * Tính thuế GTGT/TNCN cho hộ kinh doanh theo tỷ lệ % trên doanh thu.
 *
 * Nếu doanh thu luỹ kế cả năm (`yearToDateRevenue`) ≤ `exemptThreshold` thì hộ
 * thuộc diện miễn thuế: `vat = pit = 0` và `belowExemptThreshold = true`.
 * Ngược lại áp % lên doanh thu **của kỳ** (`revenue`), làm tròn về đồng.
 */
export function computeHousehold(args: {
  revenue: number;
  yearToDateRevenue: number;
  vatPercent: number;
  pitPercent: number;
  exemptThreshold: number;
}): HouseholdSummary {
  const revenue = roundVnd(args.revenue);
  const yearToDateRevenue = roundVnd(args.yearToDateRevenue);
  const { vatPercent, pitPercent, exemptThreshold } = args;

  const belowExemptThreshold = yearToDateRevenue <= exemptThreshold;

  const vat = belowExemptThreshold ? 0 : roundVnd((revenue * vatPercent) / 100);
  const pit = belowExemptThreshold ? 0 : roundVnd((revenue * pitPercent) / 100);

  return {
    revenue,
    yearToDateRevenue,
    vatPercent,
    pitPercent,
    exemptThreshold,
    belowExemptThreshold,
    vat,
    pit,
  };
}
