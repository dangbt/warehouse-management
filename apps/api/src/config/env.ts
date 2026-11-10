/**
 * Kiểm tra biến môi trường bắt buộc trước khi khởi động.
 * Hàm thuần (pure) — không phụ thuộc NestJS, dễ test.
 */
import * as crypto from 'crypto';

/** SHA-256 của secret mặc định đã public trong repo — dùng hash để chuỗi gốc không nằm trong mã nguồn. */
const BANNED_SECRET_SHA256 = '58882ded962a4ae97bdc32f0738606529c4feec523069ea2936f97679b0f7af8';
const MIN_SECRET_LENGTH = 32;

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

export interface EnvErrors {
  errors: string[];
}

/**
 * Validate biến môi trường. Trả về danh sách lỗi (rỗng = hợp lệ).
 *
 * @param env - object chứa các biến môi trường (thường là `process.env`)
 */
export function validateEnv(env: Record<string, string | undefined>): EnvErrors {
  const errors: string[] = [];

  if (!env.DATABASE_URL) {
    errors.push('DATABASE_URL chưa được cấu hình. Vui lòng đặt connection string PostgreSQL.');
  }

  const isTest = env.NODE_ENV === 'test';

  if (!isTest) {
    const secret = env.JWT_SECRET;

    if (!secret) {
      errors.push('JWT_SECRET chưa được cấu hình. Tạo bằng: openssl rand -hex 32');
    } else if (sha256(secret) === BANNED_SECRET_SHA256) {
      errors.push('JWT_SECRET đang dùng giá trị mặc định công khai. Thay bằng chuỗi bí mật riêng: openssl rand -hex 32');
    } else if (secret.length < MIN_SECRET_LENGTH) {
      errors.push(`JWT_SECRET quá ngắn (${secret.length} ký tự, tối thiểu ${MIN_SECRET_LENGTH}). Tạo bằng: openssl rand -hex 32`);
    }
  }

  return { errors };
}

/**
 * In lỗi ra stderr và thoát nếu env không hợp lệ.
 */
export function assertEnv(env: Record<string, string | undefined>): void {
  const { errors } = validateEnv(env);
  if (errors.length === 0) return;

  console.error('\n╔══════════════════════════════════════════════════════════╗');
  console.error('║  LỖI CẤU HÌNH — không thể khởi động                    ║');
  console.error('╚══════════════════════════════════════════════════════════╝\n');
  for (const msg of errors) {
    console.error(`  ✗ ${msg}`);
  }
  console.error('\nGợi ý: openssl rand -hex 32\n');
  process.exit(1);
}
