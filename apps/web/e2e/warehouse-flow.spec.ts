import { test, expect } from '@playwright/test'

const API = 'http://localhost:3001/api/v1'

test.describe('Warehouse Management - Full Flow', () => {

  test.describe('Auth', () => {
    test('login with valid credentials', async ({ page }) => {
      await page.goto('/login')
      await page.fill('input[type="email"]', 'admin@wms.vn')
      await page.fill('input[type="password"]', '123456')
      await page.click('button[type="submit"]')
      await page.waitForURL('**/dashboard')
      await expect(page.locator('text=Dashboard')).toBeVisible()
    })

    test('login with wrong password shows error', async ({ page }) => {
      await page.goto('/login')
      await page.fill('input[type="email"]', 'admin@wms.vn')
      await page.fill('input[type="password"]', 'wrong')
      await page.click('button[type="submit"]')
      await expect(page.locator('text=Email hoặc mật khẩu không đúng')).toBeVisible()
    })
  })

  test.describe('Authenticated flows', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login')
      await page.fill('input[type="email"]', 'admin@wms.vn')
      await page.fill('input[type="password"]', '123456')
      await page.click('button[type="submit"]')
      await page.waitForURL('**/dashboard')
    })

    test('dashboard shows stats', async ({ page }) => {
      await expect(page.locator('text=Nguyên liệu')).toBeVisible()
      await expect(page.locator('text=Giá trị kho')).toBeVisible()
    })

    test('navigate to ingredients', async ({ page }) => {
      await page.click('text=Nguyên liệu')
      await expect(page.locator('text=Tên nguyên liệu')).toBeVisible()
    })

    test('create ingredient', async ({ page }) => {
      await page.click('text=Nguyên liệu')
      await page.waitForSelector('text=Tên nguyên liệu')
      await page.click('text=Thêm')
      await page.waitForSelector('text=Thêm Nguyên Liệu')
      await page.fill('input[name="name"]', 'E2E Test NL')
      await page.selectOption('select[name="unit"]', 'kg')
      await page.selectOption('select[name="category"]', 'Rau')
      await page.fill('input[name="cost_per_unit"]', '50000')
      await page.fill('input[name="min_stock"]', '3')
      await page.click('button:has-text("OK")')
      await expect(page.locator('text=E2E Test NL')).toBeVisible()
    })

    test('navigate to suppliers', async ({ page }) => {
      await page.click('text=Nhà cung cấp')
      await expect(page.locator('text=Tên NCC')).toBeVisible()
    })

    test('create import order (nhập kho)', async ({ page }) => {
      await page.click('text=Nhập kho')
      await page.waitForSelector('text=Mã phiếu')
      await page.click('text=Tạo phiếu')
      await page.waitForSelector('text=Tạo Phiếu Nhập Kho')
      // Select supplier
      await page.selectOption('select[name="supplier_id"]', { index: 1 })
      // Select ingredient in first row
      await page.selectOption('select[name="items.0.ingredient_id"]', { index: 1 })
      await page.fill('input[name="items.0.quantity"]', '10')
      await page.fill('input[name="items.0.unit_price"]', '100000')
      await page.click('button:has-text("Lưu")')
      // Should show new order in list
      await expect(page.locator('text=PN-')).toBeVisible()
    })

    test('approve import order', async ({ page }) => {
      await page.click('text=Nhập kho')
      await page.waitForSelector('text=Mã phiếu')
      // Click first PENDING row
      const pendingRow = page.locator('tr:has-text("PENDING")').first()
      if (await pendingRow.isVisible()) {
        await pendingRow.click()
        await page.click('text=Duyệt')
        await page.click('button:has-text("Yes")')
        await expect(page.locator('text=COMPLETED')).toBeVisible()
      }
    })

    test('stock export (xuất kho)', async ({ page }) => {
      await page.click('text=Xuất kho')
      await page.waitForSelector('text=Nguyên liệu')
      await page.click('button:has-text("Xuất kho")')
      await page.waitForSelector('text=Thông tin xuất kho')
      await page.selectOption('select[name="ingredient_id"]', { index: 1 })
      await page.fill('input[name="quantity"]', '1')
      await page.selectOption('select[name="reason"]', 'INTERNAL_USE')
      await page.click('button:has-text("Xuất")')
      // Toast or list should update
      await page.waitForTimeout(1000)
    })

    test('view recipes', async ({ page }) => {
      await page.click('text=Công thức')
      await expect(page.locator('text=Món ăn')).toBeVisible()
    })

    test('view users', async ({ page }) => {
      await page.click('text=Users')
      await expect(page.locator('text=Họ tên')).toBeVisible()
      await expect(page.locator('text=admin@wms.vn')).toBeVisible()
    })

    test('view audit logs', async ({ page }) => {
      await page.click('text=Audit Logs')
      await expect(page.locator('text=Action')).toBeVisible()
    })

    test('view reports', async ({ page }) => {
      await page.click('text=Báo cáo')
      await expect(page.locator('text=Giá trị kho')).toBeVisible()
    })

    test('logout', async ({ page }) => {
      await page.click('text=Đăng xuất')
      await page.waitForURL('**/login')
      await expect(page.locator('text=Đăng Nhập')).toBeVisible()
    })
  })
})
