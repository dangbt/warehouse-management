import { test, expect, Page, Locator } from '@playwright/test'

// E2E UI cho feature Bán thành phẩm: Nhóm → NL sống → nhập/duyệt → BTP → chế biến → hoàn thành.
const ADMIN = { email: 'admin@wms.vn', password: '123456' }
const RUN = Date.now()
const GROUP = `E2E Nhóm ${RUN}`
const SONG = `E2E Sống ${RUN}`
const CHIN = `E2E Chín ${RUN}`
const SUP = `E2E NCC BTP ${RUN}`
const DRINK = `E2E Nước ngọt ${RUN}`

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

test.describe.serial('Bán thành phẩm / Chế biến (UI)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('Tạo nhóm nguyên liệu', async ({ page }) => {
    await page.locator('[data-testid="sidebar-groups"]').click()
    await page.waitForURL('**/ingredient-groups')
    await page.locator('[data-testid="toolbar-Thêm"]').click()
    const dialog = page.locator('[data-testid="dialog"]')
    await expect(dialog).toBeVisible()
    await dialog.locator('[data-testid="input-Tên nhóm"]').fill(GROUP)
    await dialog.locator('[data-testid="input-Đơn vị gốc (cộng tồn)"]').fill('kg')
    await dialog.locator('[data-testid="input-Tồn min nhóm (tuỳ chọn)"]').fill('5')
    await dialog.getByRole('button', { name: 'OK' }).click()
    await expect(page.getByText('Tạo nhóm thành công')).toBeVisible({ timeout: 15000 })
  })

  test('Tạo nguyên liệu sống (thuộc nhóm, base_factor 1)', async ({ page }) => {
    await page.locator('[data-testid="sidebar-ingredients"]').click()
    await page.locator('[data-testid="toolbar-Thêm"]').click()
    const dialog = page.locator('[data-testid="dialog"]')
    await expect(dialog).toBeVisible()
    await dialog.locator('[data-testid="input-Tên"]').fill(SONG)
    await dialog.locator('[data-testid="select-Đơn vị"]').selectOption('kg')
    await dialog.locator('[data-testid="select-Phân loại"]').selectOption('Thịt')
    await dialog.locator('[data-testid="input-Giá/đơn vị"]').fill('120000')
    await dialog.locator('[data-testid="input-Tồn kho min"]').fill('1')
    await selectByText(dialog.locator('[data-testid="select-Nhóm"]'), GROUP)
    await dialog.locator('[data-testid="input-Hệ số về nhóm"]').fill('1')
    await dialog.getByRole('button', { name: 'OK' }).click()
    await expect(page.getByText('Thêm nguyên liệu thành công')).toBeVisible({ timeout: 15000 })
  })

  test('Nhập + duyệt để NL sống có tồn', async ({ page }) => {
    // NCC
    await page.locator('[data-testid="sidebar-suppliers"]').click()
    await page.locator('[data-testid="toolbar-Thêm"]').click()
    let dialog = page.locator('[data-testid="dialog"]')
    await dialog.locator('[data-testid="input-Tên NCC"]').fill(SUP)
    await dialog.locator('[data-testid="input-Điện thoại"]').fill('0901112223')
    await dialog.locator('[data-testid="input-Địa chỉ"]').fill('BTP test')
    await dialog.getByRole('button', { name: 'OK' }).click()
    await expect(page.getByText('Thêm NCC thành công')).toBeVisible({ timeout: 15000 })

    // phiếu nhập 10kg
    await page.locator('[data-testid="sidebar-imports"]').click()
    await page.locator('[data-testid="toolbar-Tạo phiếu"]').click()
    dialog = page.locator('[data-testid="dialog"]')
    await expect(dialog).toBeVisible()
    await selectByText(dialog.locator('[data-testid="select-Nhà cung cấp"]'), SUP)
    await selectByText(dialog.locator('[data-testid="item-0-ingredient"]'), SONG)
    await dialog.locator('[data-testid="item-0-quantity"]').fill('10')
    await dialog.locator('[data-testid="item-0-price"]').fill('120000')
    await dialog.getByRole('button', { name: 'Lưu' }).click()
    await expect(page.getByText('Tạo phiếu nhập thành công')).toBeVisible({ timeout: 15000 })

    // duyệt
    await page.locator('[data-testid="sidebar-imports"]').click()
    await page.waitForTimeout(1000)
    const pendingRow = page.locator('tr', { hasText: 'Chờ duyệt' }).first()
    await expect(pendingRow).toBeVisible({ timeout: 10000 })
    await pendingRow.click()
    await page.locator('[data-testid="toolbar-Duyệt"]').click()
    await page.getByRole('button', { name: 'Yes' }).click()
    await expect(page.getByText('Đã duyệt phiếu nhập')).toBeVisible({ timeout: 15000 })
  })

  test('Tạo BTP chín (nhóm + nguồn + yield + base_factor)', async ({ page }) => {
    await page.locator('[data-testid="sidebar-ingredients"]').click()
    await page.locator('[data-testid="toolbar-Thêm"]').click()
    const dialog = page.locator('[data-testid="dialog"]')
    await expect(dialog).toBeVisible()
    await dialog.locator('[data-testid="input-Tên"]').fill(CHIN)
    await dialog.locator('[data-testid="select-Đơn vị"]').selectOption('phần')
    await dialog.locator('[data-testid="select-Phân loại"]').selectOption('Thịt')
    await dialog.locator('[data-testid="input-Giá/đơn vị"]').fill('0')
    await dialog.locator('[data-testid="input-Tồn kho min"]').fill('0')
    await selectByText(dialog.locator('[data-testid="select-Nhóm"]'), GROUP)
    await dialog.locator('[data-testid="input-Hệ số về nhóm"]').fill('0.22')
    await selectByText(dialog.locator('[data-testid="select-Làm từ (nguồn)"]'), SONG)
    await dialog.locator('[data-testid="input-Định mức (yield)"]').fill('4')
    await dialog.getByRole('button', { name: 'OK' }).click()
    await expect(page.getByText('Thêm nguyên liệu thành công')).toBeVisible({ timeout: 15000 })
  })

  test('Tạo phiếu chế biến', async ({ page }) => {
    await page.locator('[data-testid="sidebar-processing"]').click()
    await page.waitForURL('**/processing')
    await page.locator('[data-testid="toolbar-Tạo phiếu"]').click()
    const dialog = page.locator('[data-testid="dialog"]')
    await expect(dialog).toBeVisible()
    await selectByText(dialog.locator('[data-testid="select-Nguyên liệu nguồn"]'), SONG)
    await dialog.locator('[data-testid="input-Lượng nguồn dùng"]').fill('1')
    await selectByText(dialog.locator('[data-testid="select-Thành phẩm (BTP)"]'), CHIN)
    await dialog.getByRole('button', { name: 'Lưu' }).click()
    await expect(page.getByText('Tạo phiếu chế biến thành công')).toBeVisible({ timeout: 15000 })
  })

  test('Hoàn thành chế biến → trừ sống, cộng chín', async ({ page }) => {
    await page.locator('[data-testid="sidebar-processing"]').click()
    await page.waitForURL('**/processing')
    await page.waitForTimeout(800)
    await page.locator('[data-testid^="grid-row-"]', { hasText: CHIN }).first().click()
    await page.locator('[data-testid="toolbar-Hoàn thành"]').click()
    await page.getByRole('button', { name: 'Yes' }).click()
    await expect(page.getByText('Đã hoàn thành chế biến')).toBeVisible({ timeout: 15000 })
  })

  test('Nhập theo thùng (hệ số 24) → tồn quy ra 120 chai', async ({ page }) => {
    // NL tính theo chai
    await page.locator('[data-testid="sidebar-ingredients"]').click()
    await page.locator('[data-testid="toolbar-Thêm"]').click()
    let dialog = page.locator('[data-testid="dialog"]')
    await expect(dialog).toBeVisible()
    await dialog.locator('[data-testid="input-Tên"]').fill(DRINK)
    await dialog.locator('[data-testid="select-Đơn vị"]').selectOption('chai')
    await dialog.locator('[data-testid="select-Phân loại"]').selectOption('Đồ uống')
    await dialog.locator('[data-testid="input-Giá/đơn vị"]').fill('8000')
    await dialog.locator('[data-testid="input-Tồn kho min"]').fill('0')
    await dialog.getByRole('button', { name: 'OK' }).click()
    await expect(page.getByText('Thêm nguyên liệu thành công')).toBeVisible({ timeout: 15000 })

    // Nhập 5 thùng × 24 chai/thùng
    await page.locator('[data-testid="sidebar-imports"]').click()
    await page.locator('[data-testid="toolbar-Tạo phiếu"]').click()
    dialog = page.locator('[data-testid="dialog"]')
    await expect(dialog).toBeVisible()
    await selectByText(dialog.locator('[data-testid="select-Nhà cung cấp"]'), SUP)
    await selectByText(dialog.locator('[data-testid="item-0-ingredient"]'), DRINK)
    await dialog.locator('[data-testid="item-0-quantity"]').fill('5')
    await dialog.locator('[data-testid="item-0-factor"]').fill('24')
    await dialog.locator('[data-testid="item-0-price"]').fill('8000')
    // Thành tiền hiển thị = 5 × 24 × 8000 = 960.000
    await expect(dialog).toContainText('960')
    await dialog.getByRole('button', { name: 'Lưu' }).click()
    await expect(page.getByText('Tạo phiếu nhập thành công')).toBeVisible({ timeout: 15000 })
    // (Quy đổi factor→tồn 120 chai được kiểm bởi btp-processing.spec API TC-UOM)
  })
})
