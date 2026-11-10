# Đóng góp cho Kho Việt

## Chạy môi trường dev

```bash
npm install

# Database (PostgreSQL qua Docker)
docker run -d --name kho-viet-dev-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=kho_viet \
  -p 5432:5432 \
  postgres:16-alpine

# Backend (API) — tạo file .env thủ công
cd apps/api
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kho_viet?schema=public
JWT_SECRET=changeme-dev-secret-at-least-32-chars
CORS_ORIGINS=http://localhost:5173
EOF
npx prisma migrate dev
npx prisma db seed             # tạo dữ liệu demo (chỉ dùng cho dev)
cd ../..

# Chạy toàn bộ (turbo)
npm run dev
```

> **Lưu ý:** `JWT_SECRET` phải ≥ 32 ký tự — API từ chối khởi động nếu ngắn hơn.
> Nếu dùng PostgreSQL local (không qua Docker), sửa `DATABASE_URL` cho đúng host/port/password.

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
