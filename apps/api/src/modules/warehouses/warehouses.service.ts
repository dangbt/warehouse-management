import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { deactivateBlocker, deleteBlocker, normalizeCode } from './warehouse-rules';

export interface WarehouseInput {
  code?: string;
  name?: string;
  address?: string | null;
  is_default?: boolean;
  active?: boolean;
}

@Injectable()
export class WarehousesService {
  constructor(private prisma: PrismaService) {}

  findAll(q: { active?: string } = {}) {
    const where: Prisma.WarehouseWhereInput = {};
    if (q.active === 'true') where.active = true;
    else if (q.active === 'false') where.active = false;
    return this.prisma.warehouse.findMany({ where, orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] });
  }

  async findOne(id: string) {
    const w = await this.prisma.warehouse.findUnique({ where: { id } });
    if (!w) throw new NotFoundException('Không tìm thấy kho');
    return w;
  }

  async create(body: WarehouseInput) {
    const code = normalizeCode(body.code);
    const name = body.name?.trim();
    if (!code || !name) throw new BadRequestException('Thiếu mã hoặc tên kho');
    return this.prisma
      .$transaction(async (tx) => {
        if (body.is_default) await tx.warehouse.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
        return tx.warehouse.create({
          data: { code, name, address: body.address ?? null, isDefault: !!body.is_default, active: body.active ?? true },
        });
      })
      .catch((e) => this.rethrowUnique(e, code));
  }

  async update(id: string, body: WarehouseInput) {
    const w = await this.findOne(id);
    const data: Prisma.WarehouseUpdateInput = {};
    if (body.code !== undefined) {
      const code = normalizeCode(body.code);
      if (!code) throw new BadRequestException('Mã kho không được để trống');
      data.code = code;
    }
    if (body.name !== undefined) {
      if (!body.name.trim()) throw new BadRequestException('Tên kho không được để trống');
      data.name = body.name.trim();
    }
    if (body.address !== undefined) data.address = body.address;
    if (body.active === false) {
      const blocker = deactivateBlocker(w);
      if (blocker) throw new BadRequestException(blocker);
    }
    if (body.active !== undefined) data.active = body.active;
    if (body.is_default === false && w.isDefault)
      throw new BadRequestException('Phải luôn có 1 kho mặc định: hãy đặt kho khác làm mặc định');
    return this.prisma
      .$transaction(async (tx) => {
        if (body.is_default === true && !w.isDefault) {
          await tx.warehouse.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
          data.isDefault = true;
          data.active = true;
        }
        return tx.warehouse.update({ where: { id }, data });
      })
      .catch((e) => this.rethrowUnique(e, body.code !== undefined ? normalizeCode(body.code) : w.code));
  }

  async remove(id: string) {
    const w = await this.findOne(id);
    const [stocks, batches, txs, imports, exports, returns, takes, procs] = await Promise.all([
      this.prisma.ingredientStock.findMany({ where: { warehouseId: id }, select: { qty: true } }),
      this.prisma.ingredientBatch.count({ where: { warehouseId: id } }),
      this.prisma.stockTransaction.count({ where: { warehouseId: id } }),
      this.prisma.importOrder.count({ where: { warehouseId: id } }),
      this.prisma.stockExport.count({ where: { warehouseId: id } }),
      this.prisma.purchaseReturn.count({ where: { warehouseId: id } }),
      this.prisma.stocktakeSession.count({ where: { warehouseId: id } }),
      this.prisma.processingOrder.count({ where: { warehouseId: id } }),
    ]);
    const stockQty = stocks.reduce((s, r) => s + Math.abs(Number(r.qty)), 0);
    const documents = batches + txs + imports + exports + returns + takes + procs;
    const blocker = deleteBlocker(w, { stockQty, documents });
    if (blocker) throw new ConflictException(blocker);
    await this.prisma.$transaction([
      this.prisma.ingredientStock.deleteMany({ where: { warehouseId: id } }),
      this.prisma.warehouse.delete({ where: { id } }),
    ]);
    return { message: 'Đã xoá kho' };
  }

  private rethrowUnique(e: unknown, code: string): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException(`Mã kho ${code} đã tồn tại`);
    throw e;
  }
}
