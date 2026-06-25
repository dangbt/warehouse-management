import { test, expect, Page } from '@playwright/test'

const ADMIN = { email: 'admin@wms.vn', password: '123456' }

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(ADMIN.email)
  await page.getByLabel('Mật khẩu').fill(ADMIN.password)
  await page.getByRole('button', { name: 'Đăng Nhập' }).click()
  await page.waitForURL('**/dashboard')
}

test.describe('Warehouse Management - Full Flow', () => {

  test.describe('Authentication', () => {
    test('login with wrong password shows error', async ({ page }) => {
      await page.goto('/login')
      await page.getByLabel('Email').fill(ADMIN.email)
      await page.getByLabel('Mật khẩu').fill('wrong')
      await page.getByRole('button', { name: 'Đăng Nhập' }).click()
      await expect(page.getByText('Email hoặc mật khẩu không đúng')).toBeVisible({ timeout: 5000 })
    })

    test('login success redirects to dashboard', async ({ page }) => {
      await login(page)
      await expect(page.getByText('Dashboard')).toBeVisible()
    })
  })

  test.describe('Authenticated flows', () => {
    test.beforeEach(async ({ page }) => {
      await login(page)
    })

    test('Dashboard shows stats cards', async ({ page }) => {
      await expect(page.getByText('Nguyên liệu')).toBeVisible()
      await expect(page.getByText('Giá trị kho')).toBeVisible()
    })

    test('Navigate to ingredients', async ({ page }) => {
      await page.goto('/ingredients')
      await expect(page.locator('th', { hasText: 'Tên nguyên liệu' })).toBeVisible()
    })

    test('Create ingredient', async ({ page }) => {
      await page.goto('/ingredients')
      await page.getByRole('button', { name: 'Thêm' }).click()
      await expect(page.getByText('Thêm Nguyên Liệu')).toBeVisible()

      const dialog = page.locator('[class*="fixed"]')
      await dialog.locator('input').first().fill('E2E Test NL ' + Date.now())
      await dialog.locator('select').nth(0).selectOption('kg')
      await dialog.locator('select').nth(1).selectOption('Rau')
      await dialog.locator('input[type="number"]').nth(0).fill('10000')
      await dialog.locator('input[type="number"]').nth(1).fill('5')
      await dialog.getByRole('button', { name: 'OK' }).click()
      await expect(page.getByText('Thêm nguyên liệu thành công')).toBeVisible({ timeout: 5000 })
    })

    test('Navigate to suppliers', async ({ page }) => {
      await page.goto('/suppliers')
      await expect(page.locator('th', { hasText: 'Tên NCC' })).toBeVisible()
    })

    test('Create supplier', async ({ page }) => {
      await page.goto('/suppliers')
      await page.getByRole('button', { name: 'Thêm' }).click()
      const dialog = page.locator('[class*="fixed"]')
      await dialog.locator('input').nth(0).fill('E2E NCC ' + Date.now())
      await dialog.locator('input').nth(1).fill('0901234567')
      await dialog.locator('input').nth(2).fill('123 Test Street')
      await dialog.getByRole('button', { name: 'OK' }).click()
      await expect(page.getByText('Thêm NCC thành công')).toBeVisible({ timeout: 5000 })
    })

    test('Create import order (nhập kho)', async ({ page }) => {
      await page.goto('/import-orders')
      await page.getByRole('button', { name: 'Tạo phiếu' }).click()
      await expect(page.getByText('Tạo Phiếu Nhập Kho')).toBeVisible()

      const dialog = page.locator('[class*="fixed"]')
      // Select supplier (first option after --)
      await dialog.locator('select').first().selectOption({ index: 1 })
      // Select ingredient in table row
      await dialog.locator('table select').first().selectOption({ index: 1 })
      await dialog.locator('table input[type="number"]').nth(0).fill('10')
      await dialog.locator('table input[type="number"]').nth(1).fill('50000')
      await dialog.getByRole('button', { name: 'Lưu' }).click()
      await expect(page.getByText('Tạo phiếu nhập thành công')).toBeVisible({ timeout: 5000 })
    })

    test('Approve import order (duyệt phiếu nhập)', async ({ page }) => {
      await page.goto('/import-orders')
      await page.waitForTimeout(1000)
      const pendingRow = page.locator('tr', { hasText: 'PENDING' }).first()
      if (await pendingRow.isVisible()) {
        await pendingRow.click()
        await page.getByRole('button', { name: 'Duyệt' }).click()
        await page.getByRole('button', { name: 'Yes' }).click()
        await expect(page.getByText('Đã duyệt phiếu nhập')).toBeVisible({ timeout: 5000 })
      }
    })

    test('Stock export (xuất kho)', async ({ page }) => {
      await page.goto('/stock-exports')
      await page.getByRole('button', { name: 'Xuất kho' }).click()
      await expect(page.getByText('Thông tin xuất kho')).toBeVisible()

      const dialog = page.locator('[class*="fixed"]')
      await dialog.locator('select').nth(0).selectOption({ index: 1 })
      await dialog.locator('input[type="number"]').fill('1')
      await dialog.locator('select').nth(1).selectOption('INTERNAL_USE')
      await dialog.getByRole('button', { name: 'Xuất' }).click()
      await expect(page.getByText('Xuất kho thành công')).toBeVisible({ timeout: 5000 })
    })

    test('View recipes', async ({ page }) => {
      await page.goto('/recipes')
      await expect(page.locator('th', { hasText: 'Món ăn' })).toBeVisible()
    })

    test('View users', async ({ page }) => {
      await page.goto('/users')
      await expect(page.locator('th', { hasText: 'Họ tên' })).toBeVisible()
      await expect(page.locator('td', { hasText: 'admin@wms.vn' })).toBeVisible()
    })

    test('View audit logs', async ({ page }) => {
      await page.goto('/audit-logs')
      await expect(page.locator('th', { hasText: 'Action' })).toBeVisible()
    })

    test('View reports', async ({ page }) => {
      await page.goto('/reports')
      await expect(page.getByText('Nguyên liệu')).toBeVisible()
      await expect(page.getByText('Giá trị kho')).toBeVisible()
    })

    test('Logout', async ({ page }) => {
      await page.getByText('Đăng xuất').click()
      await page.waitForURL('**/login')
      await expect(page.getByText('Quản Lý Kho')).toBeVisible()
    })
  })
})
