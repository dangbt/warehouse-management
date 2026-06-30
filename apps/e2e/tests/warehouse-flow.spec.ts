import { test, expect, Page, Locator } from '@playwright/test'

const ADMIN = { email: 'admin@wms.vn', password: '123456' }

// DB sạch (không seed) → mọi dữ liệu phải tự dựng qua app:
// tạo NCC → NL → phiếu nhập → DUYỆT (mới có tồn + lô) → mới xuất kho được.
const RUN = Date.now()
const SUP = `E2E NCC ${RUN}`
const ING = `E2E NL ${RUN}`
const DEL_NCC = `E2E DELETE NCC ${RUN}`
const DEL_NL = `E2E DELETE NL ${RUN}`

async function login(page: Page) {
  await page.goto('/login')
  await page.locator('[data-testid="login-email"]').fill(ADMIN.email)
  await page.locator('[data-testid="login-password"]').fill(ADMIN.password)
  await page.locator('[data-testid="login-submit"]').click()
  await page.waitForURL('**/dashboard')
}

// Mở dropdown search-select, gõ tìm, chọn option theo text
async function searchAndSelect(dialog: Locator, label: string, text: string) {
  await dialog.locator(`[data-testid="select-${label}"]`).click()
  await dialog.locator(`[data-testid="search-${label}"]`).fill(text)
  // Đợi option xuất hiện sau khi API trả về
  const option = dialog.locator(`[data-testid="option-${label}"]`, { hasText: text }).first()
  await expect(option).toBeVisible({ timeout: 10000 })
  await option.click()
}

// Chọn option trong native <select> theo text hiển thị
async function selectByText(select: Locator, text: string) {
  const value = await select.locator('option', { hasText: text }).first().getAttribute('value')
  if (!value) throw new Error(`Không tìm thấy option chứa "${text}"`)
  await select.selectOption(value)
}

test.describe('Warehouse Mâm Vị - Full Flow', () => {
  test.describe('Authentication', () => {
    test('login with wrong password shows error', async ({ page }) => {
      await page.goto('/login')
      await page.locator('[data-testid="login-email"]').fill(ADMIN.email)
      await page.locator('[data-testid="login-password"]').fill('wrong')
      await page.locator('[data-testid="login-submit"]').click()
      await expect(page.locator('[data-testid="login-error"]')).toBeVisible({ timeout: 5000 })
    })

    test('login success redirects to dashboard', async ({ page }) => {
      await login(page)
      await expect(page.locator('[data-testid="app-layout"]')).toBeVisible()
    })
  })

  // ── Chuỗi nghiệp vụ tự dựng dữ liệu (serial: chạy tuần tự, dùng chung SUP/ING) ──
  test.describe.serial('Warehouse data flow (self-seeded)', () => {
    test.beforeEach(async ({ page }) => {
      await login(page)
    })

    test('Tạo nhà cung cấp', async ({ page }) => {
      await page.locator('[data-testid="sidebar-suppliers"]').click()
      await page.locator('[data-testid="toolbar-Thêm"]').click()
      const dialog = page.locator('[data-testid="dialog"]')
      await expect(dialog).toBeVisible()
      await dialog.locator('[data-testid="input-Tên NCC"]').fill(SUP)
      await dialog.locator('[data-testid="input-Điện thoại"]').fill('0901234567')
      await dialog.locator('[data-testid="input-Địa chỉ"]').fill('123 Test Street')
      await dialog.getByRole('button', { name: 'OK' }).click()
      await expect(page.getByText('Thêm NCC thành công')).toBeVisible({ timeout: 15000 })
    })

    test('Tạo nguyên liệu', async ({ page }) => {
      await page.locator('[data-testid="sidebar-ingredients"]').click()
      await page.locator('[data-testid="toolbar-Thêm"]').click()
      const dialog = page.locator('[data-testid="dialog"]')
      await expect(dialog).toBeVisible()
      await dialog.locator('[data-testid="input-Tên"]').fill(ING)
      await dialog.locator('[data-testid="select-Đơn vị"]').selectOption('kg')
      await dialog.locator('[data-testid="select-Phân loại"]').selectOption('Rau')
      await dialog.locator('[data-testid="input-Giá/đơn vị"]').fill('50000')
      await dialog.locator('[data-testid="input-Tồn kho min"]').fill('2')
      await dialog.getByRole('button', { name: 'OK' }).click()
      await expect(page.getByText('Thêm nguyên liệu thành công')).toBeVisible({ timeout: 15000 })
    })

    test('Tạo phiếu nhập kho (cho NL có tồn)', async ({ page }) => {
      await page.locator('[data-testid="sidebar-imports"]').click()
      await page.locator('[data-testid="toolbar-Tạo phiếu"]').click()
      const dialog = page.locator('[data-testid="dialog"]')
      await expect(dialog).toBeVisible()
      await selectByText(dialog.locator('[data-testid="select-Nhà cung cấp"]'), SUP)
      await searchAndSelect(dialog, 'items.0.ingredient_id', ING)
      await dialog.locator('[data-testid="item-0-quantity"]').fill('10')
      await dialog.locator('[data-testid="item-0-price"]').fill('50000')
      await dialog.getByRole('button', { name: 'Lưu' }).click()
      await expect(page.getByText('Tạo phiếu nhập thành công')).toBeVisible({ timeout: 15000 })
    })

    test('Duyệt phiếu nhập → tồn + lô được tạo', async ({ page }) => {
      await page.locator('[data-testid="sidebar-imports"]').click()
      await page.waitForTimeout(1000)
      const pendingRow = page.locator('tr', { hasText: 'Chờ duyệt' }).first()
      await expect(pendingRow).toBeVisible({ timeout: 10000 })
      await pendingRow.click()
      await page.locator('[data-testid="toolbar-Duyệt"]').click()
      await page.getByRole('button', { name: 'Yes' }).click()
      await expect(page.getByText('Đã duyệt phiếu nhập')).toBeVisible({ timeout: 15000 })
    })

    for (const r of [
      { reason: 'INTERNAL_USE', label: 'INTERNAL_USE' },
      { reason: 'DAMAGED', label: 'DAMAGED', note: 'E2E test hỏng' },
      { reason: 'EXPIRED', label: 'EXPIRED' },
    ]) {
      test(`Xuất kho (${r.label})`, async ({ page }) => {
        await page.locator('[data-testid="sidebar-exports"]').click()
        await page.locator('[data-testid="toolbar-Xuất kho"]').click()
        const dialog = page.locator('[data-testid="dialog"]')
        await expect(dialog).toBeVisible()
        await searchAndSelect(dialog, 'Nguyên liệu', ING)
        await dialog.locator('[data-testid="input-Số lượng"]').fill('1')
        await dialog.locator('[data-testid="select-Lý do"]').selectOption(r.reason)
        if (r.note) await dialog.locator('[data-testid="input-Ghi chú"]').fill(r.note)
        await dialog.getByRole('button', { name: 'Xuất' }).click()
        await expect(page.getByText('Xuất kho thành công')).toBeVisible({ timeout: 15000 })
      })
    }

    test('Xuất kho vượt tồn → báo lỗi', async ({ page }) => {
      await page.locator('[data-testid="sidebar-exports"]').click()
      await page.locator('[data-testid="toolbar-Xuất kho"]').click()
      const dialog = page.locator('[data-testid="dialog"]')
      await expect(dialog).toBeVisible()
      await searchAndSelect(dialog, 'Nguyên liệu', ING)
      await dialog.locator('[data-testid="input-Số lượng"]').fill('999999')
      await dialog.locator('[data-testid="select-Lý do"]').selectOption('OTHER')
      await dialog.getByRole('button', { name: 'Xuất' }).click()
      await expect(page.getByText('Không đủ tồn kho', { exact: true })).toBeVisible({ timeout: 15000 })
    })

    test('Từ chối phiếu nhập', async ({ page }) => {
      // Tạo phiếu mới để từ chối
      await page.locator('[data-testid="sidebar-imports"]').click()
      await page.locator('[data-testid="toolbar-Tạo phiếu"]').click()
      const dialog = page.locator('[data-testid="dialog"]')
      await expect(dialog).toBeVisible()
      await selectByText(dialog.locator('[data-testid="select-Nhà cung cấp"]'), SUP)
      await searchAndSelect(dialog, 'items.0.ingredient_id', ING)
      await dialog.locator('[data-testid="item-0-quantity"]').fill('5')
      await dialog.locator('[data-testid="item-0-price"]').fill('20000')
      await dialog.getByRole('button', { name: 'Lưu' }).click()
      await expect(page.getByText('Tạo phiếu nhập thành công')).toBeVisible({ timeout: 15000 })

      await page.waitForTimeout(1000)
      const pendingRow = page.locator('tr', { hasText: 'Chờ duyệt' }).first()
      await expect(pendingRow).toBeVisible({ timeout: 10000 })
      await pendingRow.click()
      await page.locator('[data-testid="toolbar-Từ chối"]').click()
      await page.getByRole('button', { name: 'Yes' }).click()
      await expect(page.getByText('Đã từ chối phiếu nhập')).toBeVisible({ timeout: 15000 })
    })

    test('Thanh toán công nợ NCC', async ({ page }) => {
      await page.locator('[data-testid="sidebar-suppliers"]').click()
      await page.waitForTimeout(500)
      await page.locator('[data-testid^="grid-row-"]', { hasText: SUP }).first().click()
      await page.locator('[data-testid="toolbar-Thanh toán"]').click()
      await expect(page.getByText('Nợ hiện tại')).toBeVisible()
    })

    test('Xoá NCC đã có phiếu nhập → báo lỗi', async ({ page }) => {
      await page.locator('[data-testid="sidebar-suppliers"]').click()
      await page.waitForTimeout(500)
      await page.locator('[data-testid^="grid-row-"]', { hasText: SUP }).first().click()
      await page.locator('[data-testid="toolbar-Xoá"]').click()
      await page.getByRole('button', { name: 'Yes' }).click()
      await expect(page.getByText('Không thể xoá nhà cung cấp đã có phiếu nhập')).toBeVisible({ timeout: 15000 })
    })

    test('Tạo rồi xoá NCC mới (không có phiếu)', async ({ page }) => {
      await page.locator('[data-testid="sidebar-suppliers"]').click()
      await page.locator('[data-testid="toolbar-Thêm"]').click()
      const dialog = page.locator('[data-testid="dialog"]')
      await dialog.locator('[data-testid="input-Tên NCC"]').fill(DEL_NCC)
      await dialog.locator('[data-testid="input-Điện thoại"]').fill('0900000000')
      await dialog.locator('[data-testid="input-Địa chỉ"]').fill('Delete test')
      await dialog.getByRole('button', { name: 'OK' }).click()
      await expect(page.getByText('Thêm NCC thành công')).toBeVisible({ timeout: 15000 })

      await page.waitForTimeout(500)
      await page.locator('[data-testid^="grid-row-"]', { hasText: DEL_NCC }).first().click()
      await page.locator('[data-testid="toolbar-Xoá"]').click()
      await page.getByRole('button', { name: 'Yes' }).click()
      await expect(page.getByText('Đã xoá NCC')).toBeVisible({ timeout: 15000 })
    })

    test('Tạo rồi xoá nguyên liệu mới (chưa dùng)', async ({ page }) => {
      await page.locator('[data-testid="sidebar-ingredients"]').click()
      await page.locator('[data-testid="toolbar-Thêm"]').click()
      const dialog = page.locator('[data-testid="dialog"]')
      await dialog.locator('[data-testid="input-Tên"]').fill(DEL_NL)
      await dialog.locator('[data-testid="select-Đơn vị"]').selectOption('kg')
      await dialog.locator('[data-testid="select-Phân loại"]').selectOption('Rau')
      await dialog.locator('[data-testid="input-Giá/đơn vị"]').fill('1000')
      await dialog.locator('[data-testid="input-Tồn kho min"]').fill('1')
      await dialog.getByRole('button', { name: 'OK' }).click()
      await expect(page.getByText('Thêm nguyên liệu thành công')).toBeVisible({ timeout: 15000 })

      await page.waitForTimeout(500)
      await page.locator('[data-testid^="grid-row-"]', { hasText: DEL_NL }).first().click()
      await page.locator('[data-testid="toolbar-Xoá"]').click()
      await page.getByRole('button', { name: 'Yes' }).click()
      await expect(page.getByText('Đã xoá nguyên liệu')).toBeVisible({ timeout: 15000 })
    })
  })

  // ── Điều hướng & màn hình chỉ đọc (không phụ thuộc dữ liệu nghiệp vụ) ──
  test.describe('Navigation & read-only screens', () => {
    test.beforeEach(async ({ page }) => {
      await login(page)
    })

    test('Dashboard shows stats', async ({ page }) => {
      await expect(page.getByText('Nguyên liệu').first()).toBeVisible()
      await expect(page.getByText('Giá trị kho')).toBeVisible()
    })

    test('Ingredients', async ({ page }) => {
      await page.locator('[data-testid="sidebar-ingredients"]').click()
      await page.waitForURL('**/ingredients')
      await expect(page.locator('th', { hasText: 'Tên nguyên liệu' })).toBeVisible()
    })

    test('Suppliers', async ({ page }) => {
      await page.locator('[data-testid="sidebar-suppliers"]').click()
      await page.waitForURL('**/suppliers')
      await expect(page.locator('th', { hasText: 'Tên NCC' })).toBeVisible()
    })

    test('Recipes', async ({ page }) => {
      await page.locator('[data-testid="sidebar-recipes"]').click()
      await page.waitForURL('**/recipes')
      await expect(page.locator('th', { hasText: 'Món ăn' })).toBeVisible()
    })

    test('Users', async ({ page }) => {
      await page.locator('[data-testid="sidebar-users"]').click()
      await page.waitForURL('**/users')
      await expect(page.getByText('admin@wms.vn')).toBeVisible()
    })

    test('Audit logs', async ({ page }) => {
      await page.locator('[data-testid="sidebar-audit"]').click()
      await page.waitForURL('**/audit-logs')
      await expect(page.locator('th', { hasText: 'Action' })).toBeVisible()
    })

    test('Reports', async ({ page }) => {
      await page.goto('/reports')
      await expect(page.getByText('Nguyên liệu').first()).toBeVisible()
    })

    test('Ingredient usage report + toggle period', async ({ page }) => {
      await page.locator('[data-testid="sidebar-usage"]').click()
      await page.waitForURL('**/ingredient-usage')
      await expect(page.locator('th', { hasText: 'Nguyên liệu' })).toBeVisible()
      await page.locator('[data-testid="toolbar-Tháng"]').click()
      await expect(page.locator('[data-testid="toolbar-Tháng"]')).toBeVisible()
    })

    test('Consumption variance report', async ({ page }) => {
      await page.goto('/consumption-variance')
      await expect(page.locator('th', { hasText: 'Lý thuyết' })).toBeVisible()
    })

    test('Stocktake + tạo phiên', async ({ page }) => {
      await page.locator('[data-testid="sidebar-stocktake"]').click()
      await page.waitForURL('**/stocktake')
      await expect(page.locator('th', { hasText: 'Mã phiên' })).toBeVisible()
      await page.locator('[data-testid="toolbar-Tạo phiên"]').click()
      await expect(page.getByText('Tạo phiên kiểm kê thành công')).toBeVisible({ timeout: 15000 })
    })

    test('Purchase returns', async ({ page }) => {
      await page.locator('[data-testid="sidebar-returns"]').click()
      await page.waitForURL('**/purchase-returns')
      await expect(page.locator('th', { hasText: 'Mã phiếu' })).toBeVisible()
    })

    test('KiotViet', async ({ page }) => {
      await page.locator('[data-testid="sidebar-kiotviet"]').click()
      await page.waitForURL('**/kiotviet')
      await expect(page.locator('th', { hasText: 'Mã đơn' })).toBeVisible()
    })

    test('Create ingredient validation error', async ({ page }) => {
      await page.locator('[data-testid="sidebar-ingredients"]').click()
      await page.locator('[data-testid="toolbar-Thêm"]').click()
      const dialog = page.locator('[data-testid="dialog"]')
      await expect(dialog).toBeVisible()
      await dialog.getByRole('button', { name: 'OK' }).click()
      await expect(dialog.getByText('Bắt buộc').first()).toBeVisible()
      expect(await dialog.getByText('Bắt buộc').count()).toBe(3)
    })

    test('Logout', async ({ page }) => {
      await page.getByText('Đăng xuất').click()
      await page.waitForURL('**/login')
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
    })
  })

  test.describe('Warehouse Staff role', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login')
      await page.locator('[data-testid="login-email"]').fill('kho@wms.vn')
      await page.locator('[data-testid="login-password"]').fill('123456')
      await page.locator('[data-testid="login-submit"]').click()
      await page.waitForURL('**/dashboard')
    })

    test('Can view ingredients', async ({ page }) => {
      await page.locator('[data-testid="sidebar-ingredients"]').click()
      await page.waitForURL('**/ingredients')
      await expect(page.locator('th', { hasText: 'Tên nguyên liệu' })).toBeVisible()
    })

    test('Can create ingredient', async ({ page }) => {
      await page.locator('[data-testid="sidebar-ingredients"]').click()
      await page.locator('[data-testid="toolbar-Thêm"]').click()
      await expect(page.locator('[data-testid="dialog"]')).toBeVisible()
    })

    test('Can view import orders', async ({ page }) => {
      await page.locator('[data-testid="sidebar-imports"]').click()
      await page.waitForURL('**/import-orders')
      await expect(page.locator('th', { hasText: 'Mã phiếu' })).toBeVisible()
    })

    test('Can view stock exports', async ({ page }) => {
      await page.locator('[data-testid="sidebar-exports"]').click()
      await expect(page.locator('th', { hasText: 'Nguyên liệu' })).toBeVisible()
    })

    test('Cannot access user management', async ({ page }) => {
      await page.goto('/users')
      await expect(page.getByText('Không có quyền truy cập')).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Kitchen Staff role', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login')
      await page.locator('[data-testid="login-email"]').fill('bep@wms.vn')
      await page.locator('[data-testid="login-password"]').fill('123456')
      await page.locator('[data-testid="login-submit"]').click()
      await page.waitForURL('**/dashboard')
    })

    test('Can view ingredients (read only)', async ({ page }) => {
      await page.locator('[data-testid="sidebar-ingredients"]').click()
      await page.waitForURL('**/ingredients')
      await expect(page.locator('th', { hasText: 'Tên nguyên liệu' })).toBeVisible()
    })

    test('Can view recipes', async ({ page }) => {
      await page.locator('[data-testid="sidebar-recipes"]').click()
      await page.waitForURL('**/recipes')
      await expect(page.locator('th', { hasText: 'Món ăn' })).toBeVisible()
    })

    test('Cannot access suppliers', async ({ page }) => {
      await page.goto('/suppliers')
      await expect(page.getByText('Không có quyền truy cập')).toBeVisible({ timeout: 5000 })
    })

    test('Cannot access stock exports', async ({ page }) => {
      await page.goto('/stock-exports')
      await expect(page.getByText('Không có quyền truy cập')).toBeVisible({ timeout: 5000 })
    })
  })
})
