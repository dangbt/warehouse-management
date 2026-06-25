# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: warehouse-flow.spec.ts >> Warehouse Management - Full Flow >> Authentication >> login with wrong password shows error
- Location: tests/warehouse-flow.spec.ts:8:9

# Error details

```
Test timeout of 30000ms exceeded.
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
  1   | import { test, expect } from '@playwright/test'
  2   | 
  3   | const ADMIN = { email: 'admin@wms.vn', password: '123456' }
  4   | 
  5   | test.describe('Warehouse Management - Full Flow', () => {
  6   | 
  7   |   test.describe('Authentication', () => {
  8   |     test('login with wrong password shows error', async ({ page }) => {
  9   |       await page.goto('/login')
> 10  |       await page.fill('input[type="email"]', ADMIN.email)
      |                  ^ Error: page.fill: Test timeout of 30000ms exceeded.
  11  |       await page.fill('input[type="password"]', 'wrong')
  12  |       await page.click('button[type="submit"]')
  13  |       await expect(page.locator('text=Email hoặc mật khẩu không đúng')).toBeVisible()
  14  |     })
  15  | 
  16  |     test('login success redirects to dashboard', async ({ page }) => {
  17  |       await page.goto('/login')
  18  |       await page.fill('input[type="email"]', ADMIN.email)
  19  |       await page.fill('input[type="password"]', ADMIN.password)
  20  |       await page.click('button[type="submit"]')
  21  |       await page.waitForURL('**/dashboard')
  22  |       await expect(page.locator('text=Dashboard')).toBeVisible()
  23  |     })
  24  |   })
  25  | 
  26  |   test.describe('Authenticated flows', () => {
  27  |     test.beforeEach(async ({ page }) => {
  28  |       await page.goto('/login')
  29  |       await page.fill('input[type="email"]', ADMIN.email)
  30  |       await page.fill('input[type="password"]', ADMIN.password)
  31  |       await page.click('button[type="submit"]')
  32  |       await page.waitForURL('**/dashboard')
  33  |     })
  34  | 
  35  |     test('Dashboard shows stats cards', async ({ page }) => {
  36  |       await expect(page.locator('text=Nguyên liệu')).toBeVisible()
  37  |       await expect(page.locator('text=Giá trị kho')).toBeVisible()
  38  |     })
  39  | 
  40  |     test('Navigate to ingredients via sidebar', async ({ page }) => {
  41  |       await page.click('text=Nguyên liệu')
  42  |       await expect(page.locator('th:has-text("Tên nguyên liệu")')).toBeVisible()
  43  |     })
  44  | 
  45  |     test('Create ingredient', async ({ page }) => {
  46  |       await page.click('text=Nguyên liệu')
  47  |       await page.click('button:has-text("Thêm")')
  48  |       await expect(page.locator('text=Thêm Nguyên Liệu')).toBeVisible()
  49  |       await page.locator('input').nth(0).fill('E2E Test NL ' + Date.now())
  50  |       await page.locator('select').nth(0).selectOption('kg')
  51  |       await page.locator('select').nth(1).selectOption('Rau')
  52  |       await page.locator('input[type="number"]').nth(0).fill('10000')
  53  |       await page.locator('input[type="number"]').nth(1).fill('5')
  54  |       await page.click('button:has-text("OK")')
  55  |       await expect(page.locator('text=Thêm nguyên liệu thành công')).toBeVisible({ timeout: 5000 })
  56  |     })
  57  | 
  58  |     test('Navigate to suppliers', async ({ page }) => {
  59  |       await page.click('text=Nhà cung cấp')
  60  |       await expect(page.locator('th:has-text("Tên NCC")')).toBeVisible()
  61  |     })
  62  | 
  63  |     test('Create import order (nhập kho)', async ({ page }) => {
  64  |       await page.click('text=Nhập kho')
  65  |       await page.click('button:has-text("Tạo phiếu")')
  66  |       await expect(page.locator('text=Tạo Phiếu Nhập Kho')).toBeVisible()
  67  |       // Select supplier
  68  |       await page.locator('select').first().selectOption({ index: 1 })
  69  |       // Select ingredient in first row
  70  |       await page.locator('table select').first().selectOption({ index: 1 })
  71  |       await page.locator('table input[type="number"]').nth(0).fill('10')
  72  |       await page.locator('table input[type="number"]').nth(1).fill('50000')
  73  |       await page.click('button:has-text("Lưu")')
  74  |       await expect(page.locator('text=Tạo phiếu nhập thành công')).toBeVisible({ timeout: 5000 })
  75  |     })
  76  | 
  77  |     test('Approve import order (duyệt phiếu nhập)', async ({ page }) => {
  78  |       await page.click('text=Nhập kho')
  79  |       // Click first PENDING row
  80  |       const pendingRow = page.locator('tr:has-text("PENDING")').first()
  81  |       if (await pendingRow.isVisible()) {
  82  |         await pendingRow.click()
  83  |         await page.click('button:has-text("Duyệt")')
  84  |         await page.click('button:has-text("Yes")')
  85  |         await expect(page.locator('text=Đã duyệt phiếu nhập')).toBeVisible({ timeout: 5000 })
  86  |       }
  87  |     })
  88  | 
  89  |     test('Stock export (xuất kho)', async ({ page }) => {
  90  |       await page.click('text=Xuất kho')
  91  |       await page.click('button:has-text("Xuất kho")')
  92  |       await expect(page.locator('text=Thông tin xuất kho')).toBeVisible()
  93  |       await page.locator('select').nth(0).selectOption({ index: 1 })
  94  |       await page.locator('input[type="number"]').fill('1')
  95  |       await page.locator('select').nth(1).selectOption('INTERNAL_USE')
  96  |       await page.click('button:has-text("Xuất")')
  97  |       await expect(page.locator('text=Xuất kho thành công')).toBeVisible({ timeout: 5000 })
  98  |     })
  99  | 
  100 |     test('View recipes', async ({ page }) => {
  101 |       await page.click('text=Công thức')
  102 |       await expect(page.locator('th:has-text("Món ăn")')).toBeVisible()
  103 |     })
  104 | 
  105 |     test('View users', async ({ page }) => {
  106 |       await page.click('text=Users')
  107 |       await expect(page.locator('th:has-text("Họ tên")')).toBeVisible()
  108 |       await expect(page.locator('td:has-text("admin@wms.vn")')).toBeVisible()
  109 |     })
  110 | 
```