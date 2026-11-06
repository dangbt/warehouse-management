import { BadRequestException } from '@nestjs/common';

/** Mã lỗi trả về client khi đọc hoá đơn điện tử. */
export type EinvoiceErrorCode =
  | 'EINVOICE_NO_FILES'
  | 'EINVOICE_FILE_TOO_LARGE'
  | 'EINVOICE_INVALID_FORMAT'
  | 'EINVOICE_DTD_FORBIDDEN'
  | 'EINVOICE_ZIP_INVALID'
  | 'EINVOICE_UNSUPPORTED_FILE'
  | 'EINVOICE_MISSING_FIELD';

export class EinvoiceError extends BadRequestException {
  constructor(
    public readonly errorCode: EinvoiceErrorCode,
    message: string,
  ) {
    super({ statusCode: 400, code: errorCode, message });
  }
}

export const EINVOICE_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const EINVOICE_MAX_FILES = 100;

export interface EinvoiceLine {
  stt: number;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  /** Thành tiền chưa thuế sau khi đã trừ chiết khấu. */
  amount: number;
  /** '0' | '5' | '8' | '10' | 'KCT' | 'KKKNT' */
  vatRate: string;
  vatAmount: number;
  /** Chiết khấu đã phân bổ vào dòng này (đã trừ khỏi amount). */
  discountAllocated: number;
}

export interface EinvoiceTotals {
  subtotal: number;
  vatAmount: number;
  total: number;
}

export interface EinvoiceWarning {
  code: 'TOTAL_MISMATCH' | 'VAT_MISMATCH' | 'SUBTOTAL_MISMATCH' | 'UNKNOWN_VAT_RATE' | 'DISCOUNT_UNALLOCATED';
  message: string;
}

export interface ParsedEinvoice {
  template: string;
  symbol: string;
  invoiceNo: string;
  /** yyyy-MM-dd */
  invoiceDate: string;
  seller: { taxCode: string; name: string; address: string };
  lines: EinvoiceLine[];
  /** Tổng ghi trên hoá đơn. */
  declared: EinvoiceTotals;
  /** Tổng tính lại từ các dòng. */
  computed: EinvoiceTotals;
  warnings: EinvoiceWarning[];
}
