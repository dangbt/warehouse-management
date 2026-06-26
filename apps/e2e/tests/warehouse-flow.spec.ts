import { test, expect, Page } from '@playwright/test'

const ADMIN = { email: 'admin@wms.vn', password: '123456' }

async function login(page: Page) {
  await page.goto('/login')
  await page.locator('[data-testid="login-email"]').fill(ADMIN.email)
  await page.locator('[data-testid="login-password"]').fill(ADMIN.password)
  await page.locator('[data-testid="login-submit"]').click()
  await page.waitForURL('**/dashboard')
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

  test.describe('Authenticated flows', () => {
    test.beforeEach(async ({ page }) => {
      await login(page)
    })

    test('Dashboard shows stats', async ({ page }) => {
      await expect(page.getByText('Nguyên liệu').first()).toBeVisible()
      await expect(page.getByText('Giá trị kho')).toBeVisible()
    })

    test('Navigate to ingredients via sidebar', async ({ page }) => {
      await page.locator('[data-testid="sidebar-ingredients"]').click()
      await page.waitForURL('**/ingredients')
      await expect(page.locator('th', { hasText: 'Tên nguyên liệu' })).toBeVisible()
    })

    test('Create ingredient', async ({ page }) => {
      await page.locator('[data-testid="sidebar-ingredients"]').click()
      await page.locator('[data-testid="toolbar-Thêm"]').click()

      const dialog = page.locator('[data-testid="dialog"]')
      await expect(dialog).toBeVisible()
      await dialog.locator('[data-testid="input-Tên"]').fill('E2E Test NL ' + Date.now())
      await dialog.locator('[data-testid="select-Đơn vị"]').selectOption('kg')
      await dialog.locator('[data-testid="select-Phân loại"]').selectOption('Rau')
      await dialog.locator('[data-testid="input-Giá/đơn vị"]').fill('10000')
      await dialog.locator('[data-testid="input-Tồn kho min"]').fill('5')
      await dialog.getByRole('button', { name: 'OK' }).click()
      await expect(page.getByText('Thêm nguyên liệu thành công')).toBeVisible({ timeout: 15000 })
    })

    test('Navigate to suppliers via sidebar', async ({ page }) => {
      await page.locator('[data-testid="sidebar-suppliers"]').click()
      await page.waitForURL('**/suppliers')
      await expect(page.locator('th', { hasText: 'Tên NCC' })).toBeVisible()
    })

    test('Create supplier', async ({ page }) => {
      await page.locator('[data-testid="sidebar-suppliers"]').click()
      await page.locator('[data-testid="toolbar-Thêm"]').click()

      const dialog = page.locator('[data-testid="dialog"]')
      await dialog.locator('[data-testid="input-Tên NCC"]').fill('E2E NCC ' + Date.now())
      await dialog.locator('[data-testid="input-Điện thoại"]').fill('0901234567')
      await dialog.locator('[data-testid="input-Địa chỉ"]').fill('123 Test Street')
      await dialog.getByRole('button', { name: 'OK' }).click()
      await expect(page.getByText('Thêm NCC thành công')).toBeVisible({ timeout: 15000 })
    })

    test('Create import order (nhập kho)', async ({ page }) => {
      await page.locator('[data-testid="sidebar-imports"]').click()
      await page.locator('[data-testid="toolbar-Tạo phiếu"]').click()

      const dialog = page.locator('[data-testid="dialog"]')
      await expect(dialog).toBeVisible()
      await dialog.locator('[data-testid="select-Nhà cung cấp"]').selectOption({ index: 1 })
      await dialog.locator('table select').first().selectOption({ index: 1 })
      await dialog.locator('table input[type="number"]').nth(0).fill('10')
      await dialog.locator('table input[type="number"]').nth(1).fill('50000')
      await dialog.getByRole('button', { name: 'Lưu' }).click()
      await expect(page.getByText('Tạo phiếu nhập thành công')).toBeVisible({ timeout: 15000 })
    })

    test('Approve import order (duyệt phiếu nhập)', async ({ page }) => {
      await page.locator('[data-testid="sidebar-imports"]').click()
      await page.waitForTimeout(1000)
      const pendingRow = page.locator('tr', { hasText: 'PENDING' }).first()
      if (await pendingRow.isVisible()) {
        await pendingRow.click()
        await page.locator('[data-testid="toolbar-Duyệt"]').click()
        await page.getByRole('button', { name: 'Yes' }).click()
        await expect(page.getByText('Đã duyệt phiếu nhập')).toBeVisible({ timeout: 15000 })
      }
    })

    test('Stock export (xuất kho)', async ({ page }) => {
      await page.locator('[data-testid="sidebar-exports"]').click()
      await page.locator('[data-testid="toolbar-Xuất kho"]').click()

      const dialog = page.locator('[data-testid="dialog"]')
      await expect(dialog).toBeVisible()
      await dialog.locator('[data-testid="select-Nguyên liệu"]').selectOption({ index: 1 })
      await dialog.locator('[data-testid="input-Số lượng"]').fill('1')
      await dialog.locator('[data-testid="select-Lý do"]').selectOption('INTERNAL_USE')
      await dialog.getByRole('button', { name: 'Xuất' }).click()
      await expect(page.getByText('Xuất kho thành công')).toBeVisible({ timeout: 15000 })
    })

    test('Stock export with reason DAMAGED', async ({ page }) => {
      await page.locator('[data-testid="sidebar-exports"]').click()
      await page.locator('[data-testid="toolbar-Xuất kho"]').click()

      const dialog = page.locator('[data-testid="dialog"]')
      await expect(dialog).toBeVisible()
      await dialog.locator('[data-testid="select-Nguyên liệu"]').selectOption({ index: 1 })
      await dialog.locator('[data-testid="input-Số lượng"]').fill('1')
      await dialog.locator('[data-testid="select-Lý do"]').selectOption('DAMAGED')
      await dialog.locator('[data-testid="input-Ghi chú"]').fill('E2E test hỏng')
      await dialog.getByRole('button', { name: 'Xuất' }).click()
      await expect(page.getByText('Xuất kho thành công')).toBeVisible({ timeout: 15000 })
    })

    test('Stock export with reason EXPIRED', async ({ page }) => {
      await page.locator('[data-testid="sidebar-exports"]').click()
      await page.locator('[data-testid="toolbar-Xuất kho"]').click()

      const dialog = page.locator('[data-testid="dialog"]')
      await expect(dialog).toBeVisible()
      await dialog.locator('[data-testid="select-Nguyên liệu"]').selectOption({ index: 1 })
      await dialog.locator('[data-testid="input-Số lượng"]').fill('1')
      await dialog.locator('[data-testid="select-Lý do"]').selectOption('EXPIRED')
      await dialog.getByRole('button', { name: 'Xuất' }).click()
      await expect(page.getByText('Xuất kho thành công')).toBeVisible({ timeout: 15000 })
    })

    test('Stock export insufficient stock shows error', async ({ page }) => {
      await page.locator('[data-testid="sidebar-exports"]').click()
      await page.locator('[data-testid="toolbar-Xuất kho"]').click()

      const dialog = page.locator('[data-testid="dialog"]')
      await expect(dialog).toBeVisible()
      await dialog.locator('[data-testid="select-Nguyên liệu"]').selectOption({ index: 1 })
      await dialog.locator('[data-testid="input-Số lượng"]').fill('999999')
      await dialog.locator('[data-testid="select-Lý do"]').selectOption('OTHER')
      await dialog.getByRole('button', { name: 'Xuất' }).click()
      await expect(page.getByText('Không đủ tồn kho', { exact: true })).toBeVisible({ timeout: 15000 })
    })

    test('View recipes', async ({ page }) => {
      await page.locator('[data-testid="sidebar-recipes"]').click()
      await page.waitForURL('**/recipes')
      await expect(page.locator('th', { hasText: 'Món ăn' })).toBeVisible()
    })

    test('View users', async ({ page }) => {
      await page.locator('[data-testid="sidebar-users"]').click()
      await page.waitForURL('**/users')
      await expect(page.getByText('admin@wms.vn')).toBeVisible()
    })

    test('View audit logs', async ({ page }) => {
      await page.locator('[data-testid="sidebar-audit"]').click()
      await page.waitForURL('**/audit-logs')
      await expect(page.locator('th', { hasText: 'Action' })).toBeVisible()
    })

    test('Reject import order (từ chối phiếu nhập)', async ({ page }) => {
      // Create another import order to reject
      await page.locator('[data-testid="sidebar-imports"]').click()
      await page.locator('[data-testid="toolbar-Tạo phiếu"]').click()
      const dialog = page.locator('[data-testid="dialog"]')
      await expect(dialog).toBeVisible()
      await dialog.locator('[data-testid="select-Nhà cung cấp"]').selectOption({ index: 1 })
      await dialog.locator('table select').first().selectOption({ index: 1 })
      await dialog.locator('table input[type="number"]').nth(0).fill('5')
      await dialog.locator('table input[type="number"]').nth(1).fill('20000')
      await dialog.getByRole('button', { name: 'Lưu' }).click()
      await expect(page.getByText('Tạo phiếu nhập thành công')).toBeVisible({ timeout: 15000 })

      // Reject it
      await page.waitForTimeout(1000)
      const pendingRow = page.locator('tr', { hasText: 'PENDING' }).first()
      if (await pendingRow.isVisible()) {
        await pendingRow.click()
        await page.locator('[data-testid="toolbar-Từ chối"]').click()
        await page.getByRole('button', { name: 'Yes' }).click()
        await expect(page.getByText('Đã từ chối phiếu nhập')).toBeVisible({ timeout: 15000 })
      }
    })

    test('Delete supplier with orders shows error', async ({ page }) => {
      await page.locator('[data-testid="sidebar-suppliers"]').click()
      await page.waitForTimeout(500)
      // Select a seeded supplier (not E2E created) that has import orders
      const nonE2ERow = page.locator('[data-testid^="grid-row-"]').filter({ hasNotText: 'E2E NCC' }).first()
      await nonE2ERow.click()
      await page.locator('[data-testid="toolbar-Xoá"]').click()
      await page.getByRole('button', { name: 'Yes' }).click()
      await expect(page.getByText('Không thể xoá nhà cung cấp đã có phiếu nhập')).toBeVisible({ timeout: 15000 })
    })

    test('Delete supplier', async ({ page }) => {
      await page.locator('[data-testid="sidebar-suppliers"]').click()
      // Create a fresh supplier to delete
      await page.locator('[data-testid="toolbar-Thêm"]').click()
      const dialog = page.locator('[data-testid="dialog"]')
      await dialog.locator('[data-testid="input-Tên NCC"]').fill('E2E DELETE NCC')
      await dialog.locator('[data-testid="input-Điện thoại"]').fill('0900000000')
      await dialog.locator('[data-testid="input-Địa chỉ"]').fill('Delete test')
      await dialog.getByRole('button', { name: 'OK' }).click()
      await expect(page.getByText('Thêm NCC thành công')).toBeVisible({ timeout: 15000 })

      // Now delete it
      await page.waitForTimeout(500)
      await page.locator('[data-testid^="grid-row-"]', { hasText: 'E2E DELETE NCC' }).first().click()
      await page.locator('[data-testid="toolbar-Xoá"]').click()
      await page.getByRole('button', { name: 'Yes' }).click()
      await expect(page.getByText('Đã xoá NCC')).toBeVisible({ timeout: 15000 })
    })

    test('Create ingredient validation error', async ({ page }) => {
      await page.locator('[data-testid="sidebar-ingredients"]').click()
      await page.locator('[data-testid="toolbar-Thêm"]').click()

      const dialog = page.locator('[data-testid="dialog"]')
      await expect(dialog).toBeVisible()
      // Submit without filling required fields
      await dialog.getByRole('button', { name: 'OK' }).click()
      await expect(dialog.getByText('Bắt buộc').first()).toBeVisible()
      expect(await dialog.getByText('Bắt buộc').count()).toBe(3)
    })

    test('View reports', async ({ page }) => {
      await page.goto('/reports')
      await expect(page.getByText('Nguyên liệu').first()).toBeVisible()
    })

    test('Delete ingredient in use shows error', async ({ page }) => {
      await page.locator('[data-testid="sidebar-ingredients"]').click()
      await page.waitForTimeout(500)
      await page.locator('[data-testid^="grid-row-"]').first().click()
      await page.locator('[data-testid="toolbar-Xoá"]').click()
      await page.getByRole('button', { name: 'Yes' }).click()
      await expect(page.getByText('Nguyên liệu đang được sử dụng trong công thức')).toBeVisible({ timeout: 15000 })
    })

    test('Delete ingredient', async ({ page }) => {
      await page.locator('[data-testid="sidebar-ingredients"]').click()
      await page.waitForTimeout(500)
      // Click the E2E-created ingredient (contains "E2E Test NL")
      await page.locator('[data-testid^="grid-row-"]', { hasText: 'E2E Test NL' }).first().click()
      await page.locator('[data-testid="toolbar-Xoá"]').click()
      await page.getByRole('button', { name: 'Yes' }).click()
      await expect(page.getByText('Đã xoá nguyên liệu')).toBeVisible({ timeout: 15000 })
    })

    test('Logout', async ({ page }) => {
      await page.getByText('Đăng xuất').click()
      await page.waitForURL('**/login')
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
    })
  })
})
