import { BadRequestException } from '@nestjs/common';
import { parsePeriod } from './period';

describe('parsePeriod', () => {
  describe('kỳ theo tháng (YYYY-MM)', () => {
    it('phân giải tháng 09/2026 đúng ranh giới giờ VN (UTC+7)', () => {
      const p = parsePeriod('2026-09');
      // 2026-09-01 00:00 VN = 2026-08-31T17:00:00.000Z
      expect(p.from.toISOString()).toBe('2026-08-31T17:00:00.000Z');
      // 2026-09-30 23:59:59.999 VN = 2026-09-30T16:59:59.999Z
      expect(p.to.toISOString()).toBe('2026-09-30T16:59:59.999Z');
      expect(p.label).toBe('Tháng 09/2026');
    });

    it('phân giải tháng 01 và 12', () => {
      expect(parsePeriod('2026-01').label).toBe('Tháng 01/2026');
      expect(parsePeriod('2026-12').label).toBe('Tháng 12/2026');
      // Tháng 2 năm thường có 28 ngày.
      const feb = parsePeriod('2026-02');
      expect(feb.to.toISOString()).toBe('2026-02-28T16:59:59.999Z');
      // Năm nhuận 2028: tháng 2 có 29 ngày.
      const febLeap = parsePeriod('2028-02');
      expect(febLeap.to.toISOString()).toBe('2028-02-29T16:59:59.999Z');
    });
  });

  describe('kỳ theo quý (YYYY-Qn)', () => {
    it('phân giải quý 3/2026 (tháng 7–9)', () => {
      const p = parsePeriod('2026-Q3');
      // 2026-07-01 00:00 VN = 2026-06-30T17:00:00.000Z
      expect(p.from.toISOString()).toBe('2026-06-30T17:00:00.000Z');
      // 2026-09-30 23:59:59.999 VN
      expect(p.to.toISOString()).toBe('2026-09-30T16:59:59.999Z');
      expect(p.label).toBe('Quý 3/2026');
    });

    it('phân giải quý 1 và quý 4', () => {
      const q1 = parsePeriod('2026-Q1');
      expect(q1.from.toISOString()).toBe('2025-12-31T17:00:00.000Z');
      expect(q1.to.toISOString()).toBe('2026-03-31T16:59:59.999Z');
      expect(q1.label).toBe('Quý 1/2026');

      const q4 = parsePeriod('2026-Q4');
      expect(q4.from.toISOString()).toBe('2026-09-30T17:00:00.000Z');
      expect(q4.to.toISOString()).toBe('2026-12-31T16:59:59.999Z');
      expect(q4.label).toBe('Quý 4/2026');
    });
  });

  describe('đầu vào sai → BadRequestException', () => {
    it('ném khi thiếu tham số', () => {
      expect(() => parsePeriod(undefined)).toThrow(BadRequestException);
      expect(() => parsePeriod('')).toThrow(BadRequestException);
    });

    it('ném khi tháng ngoài phạm vi', () => {
      expect(() => parsePeriod('2026-00')).toThrow(BadRequestException);
      expect(() => parsePeriod('2026-13')).toThrow(BadRequestException);
    });

    it('ném khi quý ngoài phạm vi', () => {
      expect(() => parsePeriod('2026-Q0')).toThrow(BadRequestException);
      expect(() => parsePeriod('2026-Q5')).toThrow(BadRequestException);
    });

    it('ném với định dạng lạ', () => {
      expect(() => parsePeriod('2026')).toThrow(BadRequestException);
      expect(() => parsePeriod('2026-9')).toThrow(BadRequestException);
      expect(() => parsePeriod('26-09')).toThrow(BadRequestException);
      expect(() => parsePeriod('2026/09')).toThrow(BadRequestException);
      expect(() => parsePeriod('abc')).toThrow(BadRequestException);
    });
  });
});
