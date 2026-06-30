import { test, expect, Page, Locator } from '@playwright/test'

// E2E UI cho trang Thực đơn: thêm món + cấu hình cách trừ tồn (DIRECT).
const ADMIN = { email: 'admin@wms.vn', password: '123456' }
const RUN = Date.now()
const DISH = `E2E Món ${RUN}`

async function login(page: Page) {
  await page.goto('/login')
  await page.locator('[data-testid="login-email"]').fill(ADMIN.email)
  await page.locator('[data-testid="login-password"]').fill(ADMIN.password)
  await page.locator('[data-testid="login-submit"]').click()
  await page.waitForURL('**/dashboard')
}
async function selectByText(select: Locator, text: string) {
  const value = await select.locator('option', { hasText: text }).first().getAttribute('value')
  if (!value) throw new Error(`Không tìm thấy option chứa "${text}"`)
  await select.selectOption(value)
}

// Mở WinSearchSelect dropdown, gõ tìm, chọn option
async function searchAndSelect(dialog: Locator, label: string, text: string) {
  await dialog.locator(`[data-testid="select-${label}"]`).click()
  await dialog.locator(`[data-testid="search-${label}"]`).fill(text)
  const option = dialog.locator(`[data-testid="option-${label}"]`, { hasText: text }).first()
  await expect(option).toBeVisible({ timeout: 10000 })
  await option.click()
}

test.describe.serial('Thực đơn (UI)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('Thêm món vào thực đơn', async ({ page }) => {
    await page.locator('[data-testid="sidebar-menu"]').click()
    await page.waitForURL('**/menu')
    await page.locator('[data-testid="toolbar-Thêm món"]').click()
    const dialog = page.locator('[data-testid="dialog"]')
    await expect(dialog).toBeVisible()
    await dialog.locator('[data-testid="input-Tên món"]').fill(DISH)
    await dialog.locator('[data-testid="input-Giá"]').fill('25000')
    await dialog.locator('[data-testid="input-Loại"]').fill('Đồ uống')
    // Lắng nghe refetch GET /menu-items TRƯỚC khi click để không bị miss response
    const refetch = page.waitForResponse(
      (r) => r.url().includes('/menu-items') && r.request().method() === 'GET' && r.status() === 200,
    )
    await dialog.getByRole('button', { name: 'OK' }).click()
    await expect(page.getByText('Thêm món thành công')).toBeVisible({ timeout: 15000 })
    await refetch
    // Search cho item mới (có thể nằm ở page khác)
    await page.locator('input[placeholder="Tìm kiếm..."]').fill(DISH)
    // món mới chưa cấu hình
    await expect(page.locator('[data-testid^="grid-row-"]', { hasText: DISH })).toContainText('Chưa cấu hình', { timeout: 10000 })
  })

  test('Cấu hình "Bán thẳng" (DIRECT) → trỏ 1 nguyên liệu', async ({ page }) => {
    await page.locator('[data-testid="sidebar-menu"]').click()
    await page.waitForURL('**/menu')
    await page.waitForTimeout(500)
    // Search cho item (có thể nằm ở page khác)
    await page.locator('input[placeholder="Tìm kiếm..."]').fill(DISH)
    await page.locator('[data-testid^="grid-row-"]', { hasText: DISH }).first().click()
    await page.locator('[data-testid="toolbar-Cấu hình trừ tồn"]').click()
    const dialog = page.locator('[data-testid="dialog"]')
    await expect(dialog).toBeVisible()
    await dialog.locator('[data-testid="select-Cách trừ"]').selectOption('DIRECT')
    // ô chọn nguyên liệu xuất hiện khi mode DIRECT → dùng search select
    await searchAndSelect(dialog, 'Nguyên liệu trừ', 'Thịt bò Úc')
    const refetch = page.waitForResponse(
      (r) => r.url().includes('/menu-items') && r.request().method() === 'GET' && r.status() === 200,
    )
    await dialog.getByRole('button', { name: 'Lưu' }).click()
    await expect(page.getByText('Cập nhật món thành công')).toBeVisible({ timeout: 15000 })
    await refetch
    // badge cách trừ đổi thành "Bán thẳng"
    await expect(page.locator('[data-testid^="grid-row-"]', { hasText: DISH })).toContainText('Bán thẳng', { timeout: 10000 })
  })
})
