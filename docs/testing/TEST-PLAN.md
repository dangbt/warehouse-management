# Test Plan

## Hệ Thống Quản Lý Kho Nguyên Liệu Nhà Hàng

> **Cập nhật 2026-06-26.** Một số test case dưới đây ứng với tính năng **chưa triển khai**:
> TC-AUTH-03 (khoá sau 5 lần sai), TC-AUTH-06/07/08 (token expired / refresh), TC-IMP-05 (cancel phiếu đã approve),
> TC-RCP-06 (hoàn kho khi huỷ order), TC-RCP-07/08 (block/allow khi thiếu tồn), Rate Limiting (mục 4) — đánh dấu _N/A (chưa làm)_.
> Trừ kho tự động (TC-RCP-02..05) chạy qua luồng **đồng bộ KiotViet + deduct**.
> Cần bổ sung test cho module mới: stocktake, purchase-returns + công nợ, supplier-payments, batches/HSD, kiotviet sync/deduct.

---

## 1. Phạm Vi Test

| Level            | Công cụ                 | Mô tả                                          |
| ---------------- | ----------------------- | ---------------------------------------------- |
| Unit Test (api)  | Jest                    | Test service logic riêng lẻ                    |
| Unit Test (web)  | Vitest                  | Test component/store/service web               |
| Integration Test | Jest + Supertest        | Test API endpoints + DB                        |
| E2E Test         | Playwright (`apps/e2e`) | Test UI flows (đã có: warehouse/kitchen roles) |

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

---

## 5. (ĐỀ XUẤT — chưa code) Test Cases: BTP, Nhóm & Quy đổi đơn vị

> Cho tính năng đề xuất ở `docs/PLAN.md` (Bán thành phẩm + gom nhóm + UoM). Dùng fixture dưới đây.

### 5.0 Dữ liệu mẫu (fixture)

| Thực thể               | Cấu hình                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| Nhóm "Ba rọi"          | base_unit = kg, min_stock = 5                                                                |
| Ba rọi sống            | unit = kg, cost_per_unit = 120.000, current_stock = 8, base_factor = 1, source = NULL        |
| Ba rọi chín            | unit = phần, source = ba rọi sống, yield_ratio = 4 (phần/kg), base_factor = 0.22, stock = 10 |
| Ba rọi nướng           | unit = phần, source = ba rọi sống, base_factor = 0.25, stock = 6                             |
| Nước ngọt              | unit = chai, ĐVT phụ "thùng" factor = 24, stock = 0                                          |
| Món "Cơm ba rọi nướng" | recipe: 2 phần ba rọi nướng / order                                                          |

### 5.1 Chế biến (Processing / BTP)

| ID        | Test Case                                              | Expected                                                                   |
| --------- | ------------------------------------------------------ | -------------------------------------------------------------------------- |
| TC-PRO-01 | Tạo phiếu chế biến                                     | status = DRAFT; gợi ý expected_qty = source_qty × yield_ratio              |
| TC-PRO-02 | Complete: dùng 1kg sống → thu 4 phần chín (đúng yield) | sống 8→7; chín 10→14; hao_hut = 0                                          |
| TC-PRO-03 | Complete sinh đúng giao dịch                           | có 1 PROCESS_OUT (sống −1) + 1 PROCESS_IN (chín +4)                        |
| TC-PRO-04 | Chuyển giá vốn BTP                                     | cost(chín) = (1 × 120.000) / 4 = 30.000 /phần                              |
| TC-PRO-05 | Có hao hụt: dùng 1kg sống → chỉ thu 3 phần             | chín +3; cost(chín) = 120.000/3 = 40.000; hao_hut = 1 − 3/4 = 0.25 kg sống |
| TC-PRO-06 | Complete khi sống không đủ tồn                         | 400, "Không đủ tồn nguyên liệu nguồn"; stock không đổi                     |
| TC-PRO-07 | reference_id của transaction                           | PROCESS_OUT/IN trỏ về mã phiếu chế biến (CB-...)                           |
| TC-PRO-08 | Tồn 2 lớp: order món "Cơm ba rọi nướng" ×3             | ba rọi nướng 6→0; **ba rọi sống KHÔNG đổi** (8)                            |
| TC-PRO-09 | Order vượt tồn BTP (nướng còn 6, order 4 phần ×2=8)    | tuỳ config: block 400 hoặc cho âm + cảnh báo (đồng bộ với order hiện tại)  |
| TC-PRO-10 | Complete phiếu đã COMPLETED                            | 400, chỉ complete được phiếu DRAFT                                         |

### 5.2 Gom nhóm & báo cáo tồn theo nhóm

| ID        | Test Case                          | Expected                                                                  |
| --------- | ---------------------------------- | ------------------------------------------------------------------------- |
| TC-GRP-01 | stock-summary gom nhóm "Ba rọi"    | total = 8×1 + 10×0.22 + 6×0.25 = **11.7 kg**                              |
| TC-GRP-02 | Breakdown trong nhóm               | trả 3 NL kèm đơn vị tồn gốc (kg/phần) + quy đổi từng dòng (8 / 2.2 / 1.5) |
| TC-GRP-03 | NL không thuộc nhóm (vd Nước ngọt) | hiển thị riêng, không bị gộp vào nhóm nào                                 |
| TC-GRP-04 | Cảnh báo tồn thấp cấp nhóm         | sau khi chế biến/bán còn 4.5 kg < min_stock 5 → nhóm "Ba rọi" báo thấp    |
| TC-GRP-05 | base_factor mặc định = 1           | NL gốc (sống) quy đổi 1:1                                                 |
| TC-GRP-06 | Member khác đơn vị vẫn cộng được   | kg + phần cộng ra cùng base_unit kg (không lỗi đơn vị)                    |

### 5.3 Quy đổi đơn vị (UoM)

| ID        | Test Case                                     | Expected                                                  |
| --------- | --------------------------------------------- | --------------------------------------------------------- |
| TC-UOM-01 | Nhập 5 thùng nước ngọt (factor 24)            | tồn += 5 × 24 = 120 chai                                  |
| TC-UOM-02 | Sửa factor tại phiếu nhập (thùng 12)          | tồn += 5 × 12 = 60 chai                                   |
| TC-UOM-03 | Nhập theo đơn vị tồn gốc (10 chai)            | tồn += 10 chai (không nhân factor)                        |
| TC-UOM-04 | Quy đổi phần → base_unit trong báo cáo        | 10 phần chín × 0.22 = 2.2 kg                              |
| TC-UOM-05 | Giá trị tồn (totalValue) sau quy đổi đóng gói | đơn giá tính theo đơn vị tồn gốc (chai), không phải thùng |
| TC-UOM-06 | factor ≤ 0 hoặc base_factor ≤ 0               | 400, validation từ chối                                   |
