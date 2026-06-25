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
      await expect(page.getByText('Nguyên liệu')).toBeVisible()
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
      await expect(page.getByText('Thêm Nguyên Liệu')).toBeVisible()

      const dialog = page.locator('[class*="fixed"]')
      await dialog.locator('input[type="text"]').first().fill('E2E Test NL ' + Date.now())
      await dialog.locator('select').nth(0).selectOption('kg')
      await dialog.locator('select').nth(1).selectOption('Rau')
      await dialog.locator('input[type="number"]').nth(0).fill('10000')
      await dialog.locator('input[type="number"]').nth(1).fill('5')
      await dialog.getByRole('button', { name: 'OK' }).click()
      await expect(page.getByText('Thêm nguyên liệu thành công')).toBeVisible({ timeout: 5000 })
    })

    test('Navigate to suppliers via sidebar', async ({ page }) => {
      await page.locator('[data-testid="sidebar-suppliers"]').click()
      await page.waitForURL('**/suppliers')
      await expect(page.locator('th', { hasText: 'Tên NCC' })).toBeVisible()
    })

    test('Create supplier', async ({ page }) => {
      await page.locator('[data-testid="sidebar-suppliers"]').click()
      await page.locator('[data-testid="toolbar-Thêm"]').click()

      const dialog = page.locator('[class*="fixed"]')
      await dialog.locator('input[type="text"]').nth(0).fill('E2E NCC ' + Date.now())
      await dialog.locator('input[type="text"]').nth(1).fill('0901234567')
      await dialog.locator('input[type="text"]').nth(2).fill('123 Test Street')
      await dialog.getByRole('button', { name: 'OK' }).click()
      await expect(page.getByText('Thêm NCC thành công')).toBeVisible({ timeout: 5000 })
    })

    test('Create import order (nhập kho)', async ({ page }) => {
      await page.locator('[data-testid="sidebar-imports"]').click()
      await page.locator('[data-testid="toolbar-Tạo phiếu"]').click()
      await expect(page.getByText('Tạo Phiếu Nhập Kho')).toBeVisible()

      const dialog = page.locator('[class*="fixed"]')
      await dialog.locator('select').first().selectOption({ index: 1 })
      await dialog.locator('table select').first().selectOption({ index: 1 })
      await dialog.locator('table input[type="number"]').nth(0).fill('10')
      await dialog.locator('table input[type="number"]').nth(1).fill('50000')
      await dialog.getByRole('button', { name: 'Lưu' }).click()
      await expect(page.getByText('Tạo phiếu nhập thành công')).toBeVisible({ timeout: 5000 })
    })

    test('Approve import order (duyệt phiếu nhập)', async ({ page }) => {
      await page.locator('[data-testid="sidebar-imports"]').click()
      await page.waitForTimeout(1000)
      const pendingRow = page.locator('tr', { hasText: 'PENDING' }).first()
      if (await pendingRow.isVisible()) {
        await pendingRow.click()
        await page.locator('[data-testid="toolbar-Duyệt"]').click()
        await page.getByRole('button', { name: 'Yes' }).click()
        await expect(page.getByText('Đã duyệt phiếu nhập')).toBeVisible({ timeout: 5000 })
      }
    })

    test('Stock export (xuất kho)', async ({ page }) => {
      await page.locator('[data-testid="sidebar-exports"]').click()
      await page.locator('[data-testid="toolbar-Xuất kho"]').click()
      await expect(page.getByText('Thông tin xuất kho')).toBeVisible()

      const dialog = page.locator('[class*="fixed"]')
      await dialog.locator('select').nth(0).selectOption({ index: 1 })
      await dialog.locator('input[type="number"]').fill('1')
      await dialog.locator('select').nth(1).selectOption('INTERNAL_USE')
      await dialog.getByRole('button', { name: 'Xuất' }).click()
      await expect(page.getByText('Xuất kho thành công')).toBeVisible({ timeout: 5000 })
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

    test('View reports', async ({ page }) => {
      await page.goto('/reports')
      await expect(page.getByText('Nguyên liệu')).toBeVisible()
      await expect(page.getByText('Giá trị kho')).toBeVisible()
    })

    test('Delete ingredient', async ({ page }) => {
      await page.locator('[data-testid="sidebar-ingredients"]').click()
      await page.waitForTimeout(500)
      const row = page.locator('[data-testid^="grid-row-"]').first()
      await row.click()
      await page.locator('[data-testid="toolbar-Xoá"]').click()
      await page.getByRole('button', { name: 'Yes' }).click()
      await expect(page.getByText('Đã xoá nguyên liệu')).toBeVisible({ timeout: 5000 })
    })

    test('Logout', async ({ page }) => {
      await page.getByText('Đăng xuất').click()
      await page.waitForURL('**/login')
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
    })
  })
})
