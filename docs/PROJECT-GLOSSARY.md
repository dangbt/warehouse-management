# Project Glossary - Thuật Ngữ Dự Án

| Thuật ngữ            | Tiếng Việt              | Định nghĩa                                    |
| -------------------- | ----------------------- | --------------------------------------------- |
| WMS                  | Hệ thống quản lý kho    | Warehouse Management System                   |
| Ingredient           | Nguyên liệu             | Vật phẩm dùng để chế biến món ăn              |
| Recipe               | Công thức               | Danh sách nguyên liệu + định lượng cho 1 món  |
| Import Order         | Phiếu nhập kho          | Chứng từ ghi nhận nhập hàng từ NCC            |
| Stock Export         | Phiếu xuất kho          | Chứng từ ghi nhận xuất kho (thủ công)         |
| Stock Transaction    | Giao dịch kho           | Mỗi lần stock tăng/giảm                       |
| Stock Deduct         | Trừ kho                 | Giảm stock tự động khi có order               |
| Stock Restore        | Hoàn kho                | Cộng lại stock khi huỷ order                  |
| Supplier             | Nhà cung cấp            | Đơn vị cung cấp nguyên liệu                   |
| Min Stock            | Tồn kho tối thiểu       | Mức cảnh báo khi stock thấp                   |
| Current Stock        | Tồn kho hiện tại        | Số lượng thực tế trong kho                    |
| Audit Log            | Nhật ký hoạt động       | Ghi lại mọi thao tác trên hệ thống            |
| RBAC                 | Phân quyền theo vai trò | Role-Based Access Control                     |
| Department           | Bộ phận                 | Đơn vị tổ chức (Kho, Bếp, Bar...)             |
| Role                 | Vai trò                 | Nhóm quyền (Manager, Staff...)                |
| Permission           | Quyền                   | 1 hành động cụ thể (create, read...)          |
| POS                  | Máy bán hàng            | Point of Sale                                 |
| Food Cost            | Chi phí nguyên liệu     | Giá thành nguyên liệu cho 1 món               |
| FIFO                 | Nhập trước xuất trước   | First In First Out                            |
| Stocktake            | Kiểm kê                 | Đối chiếu stock thực tế vs hệ thống           |
| Adjustment           | Điều chỉnh              | Cập nhật stock sau kiểm kê (STOCKTAKE_ADJUST) |
| Batch                | Lô hàng                 | Lượng nguyên liệu nhập 1 lần, có HSD riêng    |
| Batch Code           | Mã lô                   | `{mã phiếu nhập}-{4 ký tự item}`              |
| Expiry Date          | Hạn sử dụng (HSD)       | Ngày hết hạn của lô                           |
| Purchase Return      | Trả hàng NCC            | Trả nguyên liệu lại nhà cung cấp              |
| Supplier Debt        | Công nợ NCC             | Số tiền còn phải trả NCC (total_debt)         |
| Supplier Payment     | Thanh toán NCC          | Trả nợ NCC (CASH / TRANSFER)                  |
| KiotViet             | POS KiotViet            | Hệ thống bán hàng đồng bộ order về WMS        |
| Order Deduct         | Trừ kho theo order      | Trừ stock theo recipe khi deduct order POS    |
| Consumption Variance | Chênh lệch định mức     | So tiêu hao thực tế vs định mức công thức     |
