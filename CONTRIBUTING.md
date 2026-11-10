# Đóng góp cho Kho Việt

## Chạy môi trường dev

```bash
npm install

# Backend (API)
cd apps/api
cp .env.example .env          # cấu hình DATABASE_URL
npx prisma migrate dev
npx prisma db seed             # tạo dữ liệu demo (chỉ dùng cho dev)
cd ../..

# Chạy toàn bộ (turbo)
npm run dev
```

- API: http://localhost:3000/api/v1
- Web: http://localhost:5173 (Vite dev server)

## Chạy test

```bash
# Toàn bộ test
npm test

# Riêng từng workspace
cd apps/api && npm test        # Jest
cd apps/web && npm test        # Vitest
cd apps/e2e && npm test        # Playwright
```

## Quy tắc

- **KHÔNG tự ý sửa test case** khi chưa được người dùng cho phép. Nếu test fail → sửa code nguồn cho pass, không sửa test để "pass".
- Format code trước khi commit: `npm run format`.
- Pre-commit hook (husky) chạy lint/build/test tự động.

## Gửi Pull Request

1. Fork repo, tạo branch từ `master`.
2. Commit với message rõ ràng (tiếng Việt hoặc tiếng Anh).
3. Đảm bảo `npm test` và `npm run build` pass.
4. Mở PR vào branch `master`.

## License

Khi đóng góp, bạn đồng ý rằng code của bạn được phát hành theo license **AGPL-3.0-or-later** — cùng license với dự án. Xem file [LICENSE](LICENSE).
