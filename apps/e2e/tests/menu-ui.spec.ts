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
    await dialog.getByRole('button', { name: 'OK' }).click()
    await expect(page.getByText('Thêm món thành công')).toBeVisible({ timeout: 15000 })
    // món mới chưa cấu hình
    await expect(page.locator('[data-testid^="grid-row-"]', { hasText: DISH })).toContainText('Chưa cấu hình')
  })

  test('Cấu hình "Bán thẳng" (DIRECT) → trỏ 1 nguyên liệu', async ({ page }) => {
    await page.locator('[data-testid="sidebar-menu"]').click()
    await page.waitForURL('**/menu')
    await page.waitForTimeout(500)
    await page.locator('[data-testid^="grid-row-"]', { hasText: DISH }).first().click()
    await page.locator('[data-testid="toolbar-Cấu hình trừ tồn"]').click()
    const dialog = page.locator('[data-testid="dialog"]')
    await expect(dialog).toBeVisible()
    await dialog.locator('[data-testid="select-Cách trừ"]').selectOption('DIRECT')
    // ô chọn nguyên liệu xuất hiện khi mode DIRECT
    await selectByText(dialog.locator('[data-testid="select-Nguyên liệu trừ"]'), 'Thịt bò Úc')
    await dialog.getByRole('button', { name: 'Lưu' }).click()
    await expect(page.getByText('Cập nhật món thành công')).toBeVisible({ timeout: 15000 })
    // badge cách trừ đổi thành "Bán thẳng"
    await expect(page.locator('[data-testid^="grid-row-"]', { hasText: DISH })).toContainText('Bán thẳng')
  })
})
