import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { normalizeKey } from './item-key';

export interface MappingInput {
  supplier_id: string;
  item_name: string;
  unit?: string;
  ingredient_id: string;
  factor?: number;
}
export interface MappingHit {
  ingredientId: string;
  factor: number;
}

/** Bảng nhớ "NCC + tên hàng + ĐVT trên hoá đơn → nguyên liệu + hệ số". */
@Injectable()
export class SupplierItemMappingService {
  constructor(private prisma: PrismaService) {}

  /** Tra mapping cho các dòng hàng của 1 NCC: key = `itemKey|unitKey`. */
  async lookup(supplierId: string, lines: { name: string; unit: string }[]): Promise<Map<string, MappingHit>> {
    const rows = await this.prisma.supplierItemMapping.findMany({
      where: { supplierId, itemKey: { in: [...new Set(lines.map((l) => normalizeKey(l.name)))] } },
    });
    return new Map(rows.map((r) => [`${r.itemKey}|${r.unitKey}`, { ingredientId: r.ingredientId, factor: Number(r.factor) }]));
  }

  static keyOf(name: string, unit: string): string {
    return `${normalizeKey(name)}|${normalizeKey(unit)}`;
  }

  /** Lưu (upsert) mapping; lần sau parse hoá đơn của NCC này sẽ tự điền. */
  async saveMany(items: MappingInput[]): Promise<{ saved: number }> {
    if (!Array.isArray(items) || !items.length) throw new BadRequestException('Không có mapping nào để lưu');
    for (const m of items) {
      if (!m.supplier_id || !m.ingredient_id || !m.item_name?.trim())
        throw new BadRequestException('Mapping thiếu NCC, tên hàng hoặc nguyên liệu');
      if (m.factor != null && !(m.factor > 0 && m.factor < 1e8)) throw new BadRequestException('Hệ số quy đổi phải > 0');
    }
    await this.prisma.$transaction(
      items.map((m) => {
        const itemKey = normalizeKey(m.item_name);
        const unitKey = normalizeKey(m.unit ?? '');
        const data = { itemName: m.item_name.trim(), unit: (m.unit ?? '').trim(), ingredientId: m.ingredient_id, factor: m.factor ?? 1 };
        return this.prisma.supplierItemMapping.upsert({
          where: { supplierId_itemKey_unitKey: { supplierId: m.supplier_id, itemKey, unitKey } },
          create: { supplierId: m.supplier_id, itemKey, unitKey, ...data },
          update: data,
        });
      }),
    );
    return { saved: items.length };
  }
}
