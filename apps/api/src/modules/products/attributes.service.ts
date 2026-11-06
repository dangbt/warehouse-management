import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toCode } from './sku';
import { mapUniqueError } from './unique-conflict';

@Injectable()
export class AttributesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.productAttribute.findMany({
      orderBy: [{ sort: 'asc' }, { code: 'asc' }],
      include: { values: { orderBy: [{ sort: 'asc' }, { value: 'asc' }] } },
    });
  }

  async create(b: { name: string; code?: string; sort?: number }) {
    try {
      return await this.prisma.productAttribute.create({
        data: { name: b.name, code: toCode(b.code || b.name), sort: b.sort ?? 0 },
        include: { values: true },
      });
    } catch (e) {
      return mapUniqueError(e);
    }
  }

  async update(id: string, b: { name?: string; code?: string; sort?: number }) {
    await this.mustFind(id);
    try {
      return await this.prisma.productAttribute.update({
        where: { id },
        data: { name: b.name, code: b.code ? toCode(b.code) : undefined, sort: b.sort },
        include: { values: true },
      });
    } catch (e) {
      return mapUniqueError(e);
    }
  }

  async remove(id: string) {
    await this.mustFind(id);
    return this.prisma.productAttribute.delete({ where: { id } });
  }

  async addValue(attributeId: string, b: { value: string; code?: string; sort?: number }) {
    await this.mustFind(attributeId);
    try {
      return await this.prisma.productAttributeValue.create({
        data: { attributeId, value: b.value, code: toCode(b.code || b.value), sort: b.sort ?? 0 },
      });
    } catch (e) {
      return mapUniqueError(e);
    }
  }

  async updateValue(valueId: string, b: { value?: string; code?: string; sort?: number }) {
    try {
      return await this.prisma.productAttributeValue.update({
        where: { id: valueId },
        data: { value: b.value, code: b.code ? toCode(b.code) : undefined, sort: b.sort },
      });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2025') throw new NotFoundException('Giá trị không tồn tại');
      return mapUniqueError(e);
    }
  }

  async removeValue(valueId: string) {
    try {
      return await this.prisma.productAttributeValue.delete({ where: { id: valueId } });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2025') throw new NotFoundException('Giá trị không tồn tại');
      throw e;
    }
  }

  private async mustFind(id: string) {
    const a = await this.prisma.productAttribute.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Thuộc tính không tồn tại');
    return a;
  }
}
