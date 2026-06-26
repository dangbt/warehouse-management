# Test Plan

## Hệ Thống Quản Lý Kho Nguyên Liệu Nhà Hàng

---

## 1. Phạm Vi Test

| Level            | Công cụ            | Mô tả                       |
| ---------------- | ------------------ | --------------------------- |
| Unit Test        | Jest               | Test service logic riêng lẻ |
| Integration Test | Jest + Supertest   | Test API endpoints + DB     |
| E2E Test         | Cypress/Playwright | Test UI flows               |

---

## 2. Test Cases Chính

### 2.1 Authentication

| ID         | Test Case                   | Expected                    |
| ---------- | --------------------------- | --------------------------- |
| TC-AUTH-01 | Login đúng email + password | 200, trả token              |
| TC-AUTH-02 | Login sai password          | 401, error message          |
| TC-AUTH-03 | Login sai 5 lần liên tiếp   | 429, account locked         |
| TC-AUTH-04 | Login account bị deactivate | 401, "Tài khoản đã bị khoá" |
| TC-AUTH-05 | Gọi API không có token      | 401, Unauthorized           |
| TC-AUTH-06 | Gọi API với token expired   | 401, Token expired          |
| TC-AUTH-07 | Refresh token thành công    | 200, new access token       |
| TC-AUTH-08 | Refresh token expired       | 401, yêu cầu login lại      |

### 2.2 Authorization (RBAC)

| ID         | Test Case                          | Expected        |
| ---------- | ---------------------------------- | --------------- |
| TC-RBAC-01 | Warehouse Staff tạo phiếu nhập     | 201, thành công |
| TC-RBAC-02 | Warehouse Staff approve phiếu nhập | 403, Forbidden  |
| TC-RBAC-03 | Manager approve phiếu nhập         | 200, thành công |
| TC-RBAC-04 | Kitchen Staff xem ingredients      | 200, thành công |
| TC-RBAC-05 | Kitchen Staff tạo ingredients      | 403, Forbidden  |
| TC-RBAC-06 | Accountant xem audit logs          | 200, thành công |
| TC-RBAC-07 | Service Staff xem audit logs       | 403, Forbidden  |

### 2.3 Ingredients

| ID        | Test Case                          | Expected                   |
| --------- | ---------------------------------- | -------------------------- |
| TC-ING-01 | Tạo nguyên liệu hợp lệ             | 201, current_stock = 0     |
| TC-ING-02 | Tạo nguyên liệu trùng tên          | 409, Conflict              |
| TC-ING-03 | Xoá nguyên liệu đang trong recipe  | 400, "Đang được sử dụng"   |
| TC-ING-04 | Xoá nguyên liệu không trong recipe | 200, soft delete           |
| TC-ING-05 | Filter low_stock=true              | Chỉ trả NL có stock <= min |

### 2.4 Import Orders

| ID        | Test Case                        | Expected                          |
| --------- | -------------------------------- | --------------------------------- |
| TC-IMP-01 | Tạo phiếu nhập hợp lệ            | 201, status=PENDING               |
| TC-IMP-02 | Approve phiếu → stock tăng       | stock += quantity mỗi item        |
| TC-IMP-03 | Approve phiếu → tạo transactions | Có records type=IMPORT            |
| TC-IMP-04 | Reject phiếu                     | status=REJECTED, stock không đổi  |
| TC-IMP-05 | Cancel phiếu đã approve          | stock trừ lại, có transaction đảo |
| TC-IMP-06 | Approve phiếu đã reject          | 400, chỉ approve PENDING          |

### 2.5 Stock Export

| ID        | Test Case         | Expected                        |
| --------- | ----------------- | ------------------------------- |
| TC-EXP-01 | Xuất kho hợp lệ   | stock giảm, transaction created |
| TC-EXP-02 | Xuất vượt tồn kho | 400, "Không đủ tồn kho"         |

### 2.6 Recipe & Auto Deduct

| ID        | Test Case                        | Expected                        |
| --------- | -------------------------------- | ------------------------------- |
| TC-RCP-01 | Tạo recipe cho món               | 201, recipe + ingredients saved |
| TC-RCP-02 | Order 1 món → trừ đúng công thức | stock giảm đúng recipe qty      |
| TC-RCP-03 | Order 3 phần 1 món               | stock giảm = recipe_qty × 3     |
| TC-RCP-04 | Order 2 món khác nhau            | Trừ đúng cho cả 2 recipe        |
| TC-RCP-05 | Order món không có recipe        | Skip, ghi warning               |
| TC-RCP-06 | Huỷ order → hoàn kho             | stock cộng lại đúng số đã trừ   |
| TC-RCP-07 | Stock không đủ (mode block)      | 400, order bị reject            |
| TC-RCP-08 | Stock không đủ (mode allow)      | 200, stock âm, có cảnh báo      |

### 2.7 Audit Logs

| ID        | Test Case                                 | Expected                 |
| --------- | ----------------------------------------- | ------------------------ |
| TC-AUD-01 | Tạo ingredient → có audit log             | Log với action=CREATE    |
| TC-AUD-02 | Update ingredient → log có old/new values | Đúng giá trị trước/sau   |
| TC-AUD-03 | Approve phiếu → log ghi approved_by       |                          |
| TC-AUD-04 | Filter audit logs by user                 | Chỉ trả logs của user đó |
| TC-AUD-05 | Filter by date range                      | Đúng khoảng thời gian    |

---

## 3. Performance Test

| Scenario                                   | Target        |
| ------------------------------------------ | ------------- |
| 50 concurrent users login                  | < 2s response |
| Deduct stock for order (10 items)          | < 2s total    |
| Query ingredients (1000 records)           | < 500ms       |
| Query audit logs (100k records, paginated) | < 1s          |

---

## 4. Security Test

| Test            | Mô tả                                               |
| --------------- | --------------------------------------------------- |
| SQL Injection   | Thử inject qua search params                        |
| XSS             | Thử inject script qua input fields                  |
| Token Tampering | Sửa JWT payload → reject                            |
| Rate Limiting   | Verify khoá sau 5 lần sai                           |
| IDOR            | User A không xem được data của User B (nếu áp dụng) |
