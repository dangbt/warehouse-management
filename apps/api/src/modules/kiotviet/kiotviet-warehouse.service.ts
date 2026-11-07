import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WarehouseStockService } from '../common/warehouse-stock.service';

const KEY = 'kiotviet_branch_warehouses';

export interface BranchWarehouseMap {
  /** Kho dùng khi chi nhánh không có trong mapping; bỏ trống ⇒ kho mặc định (kho chính). */
  defaultWarehouseId: string | null;
  /** branchId KiotViet → warehouseId */
  branches: Record<string, string>;
}

/** Chọn kho trừ tồn cho đơn KiotViet theo chi nhánh (mapping lưu ở app_settings). */
@Injectable()
export class KiotVietWarehouseService {
  constructor(
    private prisma: PrismaService,
    private stock: WarehouseStockService,
  ) {}

  async getMap(): Promise<BranchWarehouseMap> {
    const row = await this.prisma.appSetting.findUnique({ where: { key: KEY } });
    const v = (row?.value ?? {}) as Partial<BranchWarehouseMap>;
    return { defaultWarehouseId: v.defaultWarehouseId ?? null, branches: v.branches ?? {} };
  }

  async setMap(input: Partial<BranchWarehouseMap>): Promise<BranchWarehouseMap> {
    const branches: Record<string, string> = {};
    for (const [branchId, wid] of Object.entries(input.branches ?? {})) {
      if (typeof wid !== 'string') throw new BadRequestException('Mapping chi nhánh → kho không hợp lệ');
      branches[String(branchId)] = await this.stock.resolveId(wid);
    }
    const defaultWarehouseId = input.defaultWarehouseId ? await this.stock.resolveId(input.defaultWarehouseId) : null;
    const value = { defaultWarehouseId, branches };
    await this.prisma.appSetting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
    return value;
  }

  /** Kho cho 1 chi nhánh: mapping chi nhánh → kho mặc định cấu hình → kho chính. */
  async resolveForBranch(branchId: string | null | undefined): Promise<string> {
    const map = await this.getMap();
    const configured = (branchId ? map.branches[branchId] : undefined) ?? map.defaultWarehouseId;
    if (configured) {
      // Kho đã bị tắt/xoá sau khi cấu hình ⇒ rơi về kho chính thay vì chặn trừ kho.
      try {
        return await this.stock.resolveId(configured);
      } catch {
        /* fallthrough */
      }
    }
    return this.stock.resolveId(null);
  }
}
