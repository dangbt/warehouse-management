import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

type PrismaTransaction = Omit<Prisma.TransactionClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class BatchDeductionService {
  async deductFromBatches(tx: PrismaTransaction, ingredientId: string, quantity: number): Promise<{ batchId: string; qty: number }[]> {
    const batches = await tx.ingredientBatch.findMany({
      where: { ingredientId, status: 'ACTIVE', quantity: { gt: 0 } },
      orderBy: [{ expiryDate: { sort: 'asc', nulls: 'last' } }, { receivedDate: 'asc' }],
    });

    let remaining = quantity;
    const results: { batchId: string; qty: number }[] = [];

    for (const batch of batches) {
      if (remaining <= 0) break;
      const available = Number(batch.quantity);
      const deduct = Math.min(available, remaining);

      await tx.ingredientBatch.update({
        where: { id: batch.id },
        data: {
          quantity: { decrement: deduct },
          status: available - deduct <= 0 ? 'DEPLETED' : 'ACTIVE',
        },
      });

      results.push({ batchId: batch.id, qty: deduct });
      remaining -= deduct;
    }

    if (remaining > 0) {
      throw new BadRequestException(`Không đủ tồn kho theo lô cho nguyên liệu ${ingredientId}. Thiếu: ${remaining.toFixed(3)}`);
    }

    return results;
  }
}
