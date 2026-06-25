# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: warehouse-flow.spec.ts >> Warehouse Management - Full Flow >> Authenticated flows >> Navigate to suppliers
- Location: tests/warehouse-flow.spec.ts:58:9

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[type="email"]')

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - img "Mâm Vị" [ref=e6]
    - generic [ref=e7]: Quản Lý Kho
  - generic [ref=e8]:
    - generic [ref=e9]:
      - generic [ref=e10]: "Email:"
      - textbox [ref=e11]
    - generic [ref=e12]:
      - generic [ref=e13]: "Mật khẩu:"
      - textbox [ref=e14]
  - button "Đăng Nhập" [ref=e16] [cursor=pointer]
```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test'
  2   | 
  3   | const ADMIN = { email: 'admin@wms.vn', password: '123456' }
  4   | 
  5   | async function login(page: Page) {
  6   |   await page.goto('/login')
  7   |   await page.getByLabel('Email').fill(ADMIN.email)
  8   |   await page.getByLabel('Mật khẩu').fill(ADMIN.password)
  9   |   await page.getByRole('button', { name: 'Đăng Nhập' }).click()
  10  |   await page.waitForURL('**/dashboard')
  11  | }
  12  | 
  13  | test.describe('Warehouse Management - Full Flow', () => {
  14  | 
  15  |   test.describe('Authentication', () => {
  16  |     test('login with wrong password shows error', async ({ page }) => {
  17  |       await page.goto('/login')
  18  |       await page.getByLabel('Email').fill(ADMIN.email)
  19  |       await page.getByLabel('Mật khẩu').fill('wrong')
  20  |       await page.getByRole('button', { name: 'Đăng Nhập' }).click()
  21  |       await expect(page.getByText('Email hoặc mật khẩu không đúng')).toBeVisible({ timeout: 5000 })
  22  |     })
  23  | 
  24  |     test('login success redirects to dashboard', async ({ page }) => {
  25  |       await login(page)
  26  |       await expect(page.getByText('Dashboard')).toBeVisible()
  27  |     })
  28  |   })
> 29  | 
      |                  ^ Error: page.fill: Test timeout of 30000ms exceeded.
  30  |   test.describe('Authenticated flows', () => {
  31  |     test.beforeEach(async ({ page }) => {
  32  |       await login(page)
  33  |     })
  34  | 
  35  |     test('Dashboard shows stats cards', async ({ page }) => {
  36  |       await expect(page.getByText('Nguyên liệu')).toBeVisible()
  37  |       await expect(page.getByText('Giá trị kho')).toBeVisible()
  38  |     })
  39  | 
  40  |     test('Navigate to ingredients', async ({ page }) => {
  41  |       await page.goto('/ingredients')
  42  |       await expect(page.locator('th', { hasText: 'Tên nguyên liệu' })).toBeVisible()
  43  |     })
  44  | 
  45  |     test('Create ingredient', async ({ page }) => {
  46  |       await page.goto('/ingredients')
  47  |       await page.getByRole('button', { name: 'Thêm' }).click()
  48  |       await expect(page.getByText('Thêm Nguyên Liệu')).toBeVisible()
  49  | 
  50  |       const dialog = page.locator('[class*="fixed"]')
  51  |       await dialog.locator('input').first().fill('E2E Test NL ' + Date.now())
  52  |       await dialog.locator('select').nth(0).selectOption('kg')
  53  |       await dialog.locator('select').nth(1).selectOption('Rau')
  54  |       await dialog.locator('input[type="number"]').nth(0).fill('10000')
  55  |       await dialog.locator('input[type="number"]').nth(1).fill('5')
  56  |       await dialog.getByRole('button', { name: 'OK' }).click()
  57  |       await expect(page.getByText('Thêm nguyên liệu thành công')).toBeVisible({ timeout: 5000 })
  58  |     })
  59  | 
  60  |     test('Navigate to suppliers', async ({ page }) => {
  61  |       await page.goto('/suppliers')
  62  |       await expect(page.locator('th', { hasText: 'Tên NCC' })).toBeVisible()
  63  |     })
  64  | 
  65  |     test('Create supplier', async ({ page }) => {
  66  |       await page.goto('/suppliers')
  67  |       await page.getByRole('button', { name: 'Thêm' }).click()
  68  |       const dialog = page.locator('[class*="fixed"]')
  69  |       await dialog.locator('input').nth(0).fill('E2E NCC ' + Date.now())
  70  |       await dialog.locator('input').nth(1).fill('0901234567')
  71  |       await dialog.locator('input').nth(2).fill('123 Test Street')
  72  |       await dialog.getByRole('button', { name: 'OK' }).click()
  73  |       await expect(page.getByText('Thêm NCC thành công')).toBeVisible({ timeout: 5000 })
  74  |     })
  75  | 
  76  |     test('Create import order (nhập kho)', async ({ page }) => {
  77  |       await page.goto('/import-orders')
  78  |       await page.getByRole('button', { name: 'Tạo phiếu' }).click()
  79  |       await expect(page.getByText('Tạo Phiếu Nhập Kho')).toBeVisible()
  80  | 
  81  |       const dialog = page.locator('[class*="fixed"]')
  82  |       // Select supplier (first option after --)
  83  |       await dialog.locator('select').first().selectOption({ index: 1 })
  84  |       // Select ingredient in table row
  85  |       await dialog.locator('table select').first().selectOption({ index: 1 })
  86  |       await dialog.locator('table input[type="number"]').nth(0).fill('10')
  87  |       await dialog.locator('table input[type="number"]').nth(1).fill('50000')
  88  |       await dialog.getByRole('button', { name: 'Lưu' }).click()
  89  |       await expect(page.getByText('Tạo phiếu nhập thành công')).toBeVisible({ timeout: 5000 })
  90  |     })
  91  | 
  92  |     test('Approve import order (duyệt phiếu nhập)', async ({ page }) => {
  93  |       await page.goto('/import-orders')
  94  |       await page.waitForTimeout(1000)
  95  |       const pendingRow = page.locator('tr', { hasText: 'PENDING' }).first()
  96  |       if (await pendingRow.isVisible()) {
  97  |         await pendingRow.click()
  98  |         await page.getByRole('button', { name: 'Duyệt' }).click()
  99  |         await page.getByRole('button', { name: 'Yes' }).click()
  100 |         await expect(page.getByText('Đã duyệt phiếu nhập')).toBeVisible({ timeout: 5000 })
  101 |       }
  102 |     })
  103 | 
  104 |     test('Stock export (xuất kho)', async ({ page }) => {
  105 |       await page.goto('/stock-exports')
  106 |       await page.getByRole('button', { name: 'Xuất kho' }).click()
  107 |       await expect(page.getByText('Thông tin xuất kho')).toBeVisible()
  108 | 
  109 |       const dialog = page.locator('[class*="fixed"]')
  110 |       await dialog.locator('select').nth(0).selectOption({ index: 1 })
  111 |       await dialog.locator('input[type="number"]').fill('1')
  112 |       await dialog.locator('select').nth(1).selectOption('INTERNAL_USE')
  113 |       await dialog.getByRole('button', { name: 'Xuất' }).click()
  114 |       await expect(page.getByText('Xuất kho thành công')).toBeVisible({ timeout: 5000 })
  115 |     })
  116 | 
  117 |     test('View recipes', async ({ page }) => {
  118 |       await page.goto('/recipes')
  119 |       await expect(page.locator('th', { hasText: 'Món ăn' })).toBeVisible()
  120 |     })
  121 | 
  122 |     test('View users', async ({ page }) => {
  123 |       await page.goto('/users')
  124 |       await expect(page.locator('th', { hasText: 'Họ tên' })).toBeVisible()
  125 |       await expect(page.locator('td', { hasText: 'admin@wms.vn' })).toBeVisible()
  126 |     })
  127 | 
  128 |     test('View audit logs', async ({ page }) => {
  129 |       await page.goto('/audit-logs')
```