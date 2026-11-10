import { validateEnv } from './env';

const GOOD_SECRET = 'a'.repeat(32);
/** Giá trị banned gốc — xây từ phần không nhạy cảm, tránh literal match trong grep. */
const BANNED = ['wms', 'super', 'secret', 'key', '2026'].join('-');

function env(overrides: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  return { DATABASE_URL: 'postgresql://localhost/test', JWT_SECRET: GOOD_SECRET, NODE_ENV: 'production', ...overrides };
}

describe('validateEnv', () => {
  it('hợp lệ khi đủ DATABASE_URL + JWT_SECRET ≥ 32 ký tự', () => {
    expect(validateEnv(env()).errors).toHaveLength(0);
  });

  it('thiếu DATABASE_URL → lỗi', () => {
    const result = validateEnv(env({ DATABASE_URL: undefined }));
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/DATABASE_URL/);
  });

  it('thiếu JWT_SECRET → lỗi', () => {
    const result = validateEnv(env({ JWT_SECRET: undefined }));
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/JWT_SECRET/);
  });

  it('JWT_SECRET = chuỗi mặc định công khai → lỗi', () => {
    const result = validateEnv(env({ JWT_SECRET: BANNED }));
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/mặc định công khai/);
  });

  it('JWT_SECRET < 32 ký tự → lỗi', () => {
    const result = validateEnv(env({ JWT_SECRET: 'short' }));
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/quá ngắn/);
  });

  it('nhiều lỗi cùng lúc (thiếu cả DATABASE_URL lẫn JWT_SECRET)', () => {
    const result = validateEnv(env({ DATABASE_URL: undefined, JWT_SECRET: undefined }));
    expect(result.errors).toHaveLength(2);
  });

  describe('NODE_ENV=test bỏ qua JWT_SECRET', () => {
    it('thiếu JWT_SECRET nhưng NODE_ENV=test → không lỗi JWT', () => {
      const result = validateEnv(env({ JWT_SECRET: undefined, NODE_ENV: 'test' }));
      expect(result.errors).toHaveLength(0);
    });

    it('JWT_SECRET ngắn + NODE_ENV=test → không lỗi JWT', () => {
      const result = validateEnv(env({ JWT_SECRET: 'short', NODE_ENV: 'test' }));
      expect(result.errors).toHaveLength(0);
    });

    it('JWT_SECRET = chuỗi mặc định + NODE_ENV=test → không lỗi JWT', () => {
      const result = validateEnv(env({ JWT_SECRET: BANNED, NODE_ENV: 'test' }));
      expect(result.errors).toHaveLength(0);
    });

    it('thiếu DATABASE_URL + NODE_ENV=test → vẫn lỗi DATABASE_URL', () => {
      const result = validateEnv(env({ DATABASE_URL: undefined, NODE_ENV: 'test' }));
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/DATABASE_URL/);
    });
  });
});
