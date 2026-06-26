# Changelog

## [Unreleased]

### Phase 0: Auth & Users

- [x] DB migrations (users, departments, roles, role_permissions, user_roles, audit_logs)
- [x] Auth: login + JWT
- [x] CRUD Users; Departments/Roles (read) + cấu hình permissions cho role
- [x] RBAC Guard (JwtAuthGuard + PermissionsGuard)
- [x] Audit Log
- [ ] Refresh token / logout / change-password

### Phase 1: Warehouse Core

- [x] CRUD Ingredients
- [x] CRUD Suppliers (gồm delete)
- [x] Import Orders + Approval (approve / reject)
- [x] Stock Export (thủ công)
- [x] Ingredient Batches (lô + hạn sử dụng, FIFO)

### Phase 2: Recipe & Auto Deduct

- [x] CRUD Recipes (chưa có delete) + Menu items
- [x] Đồng bộ order KiotViet → auto deduct stock theo recipe
- [ ] Cancel order → Restore stock (ORDER_RESTORE)

### Phase 3: Reports & Alerts

- [x] Dashboard
- [x] Reports: stock-summary, stock-movement, ingredient-usage, consumption-variance
- [x] Cảnh báo lô sắp hết hạn (`/reports/expiring`)
- [ ] Export Excel/PDF

### Phase 4: Advanced

- [x] Kiểm kê (stocktake) + điều chỉnh tồn (STOCKTAKE_ADJUST)
- [x] Quản lý lô + hạn sử dụng (FIFO)
- [x] Trả hàng NCC + công nợ NCC + thanh toán NCC (CASH/TRANSFER)
- [x] Tích hợp POS KiotViet (sync thủ công + sync qua API)
- [ ] Đề xuất nhập hàng tự động

### Hạ tầng

- [x] Monorepo Turborepo + npm workspaces
- [x] E2E Playwright (warehouse staff, kitchen staff roles)
- [x] Permission guard trên route + trang "Không có quyền truy cập"
- [ ] Redis / Bull Queue (auto-deduct hiện chạy đồng bộ)
