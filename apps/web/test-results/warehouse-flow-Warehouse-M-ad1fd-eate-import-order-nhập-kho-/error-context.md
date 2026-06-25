# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: warehouse-flow.spec.ts >> Warehouse Management - Full E2E Flow >> Authenticated flows >> Create import order (nhập kho)
- Location: e2e/warehouse-flow.spec.ts:82:5

# Error details

```
Test timeout of 10000ms exceeded while running "beforeEach" hook.
```

```
Error: page.fill: Test timeout of 10000ms exceeded.
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
  5   | test.describe('Warehouse Management - Full E2E Flow', () => {
  6   | 
  7   |   test.describe('Auth', () => {
  8   |     test('shows login page', async ({ page }) => {
  9   |       await page.goto('/login')
  10  |       await expect(page.locator('text=Quản Lý Kho')).toBeVisible()
  11  |     })
  12  | 
  13  |     test('login with wrong password shows error', async ({ page }) => {
  14  |       await page.goto('/login')
  15  |       await page.fill('input[type="email"]', ADMIN.email)
  16  |       await page.fill('input[type="password"]', 'wrong')
  17  |       await page.click('button[type="submit"]')
  18  |       await expect(page.locator('text=Email hoặc mật khẩu không đúng')).toBeVisible()
  19  |     })
  20  | 
  21  |     test('login success redirects to dashboard', async ({ page }) => {
  22  |       await page.goto('/login')
  23  |       await page.fill('input[type="email"]', ADMIN.email)
  24  |       await page.fill('input[type="password"]', ADMIN.password)
  25  |       await page.click('button[type="submit"]')
  26  |       await expect(page).toHaveURL(/dashboard/)
  27  |       await expect(page.locator('text=Dashboard')).toBeVisible()
  28  |     })
  29  |   })
  30  | 
  31  |   test.describe('Authenticated flows', () => {
  32  |     test.beforeEach(async ({ page }) => {
  33  |       await page.goto('/login')
> 34  |       await page.fill('input[type="email"]', ADMIN.email)
      |                  ^ Error: page.fill: Test timeout of 10000ms exceeded.
  35  |       await page.fill('input[type="password"]', ADMIN.password)
  36  |       await page.click('button[type="submit"]')
  37  |       await page.waitForURL(/dashboard/)
  38  |     })
  39  | 
  40  |     test('Dashboard shows stats', async ({ page }) => {
  41  |       await expect(page.locator('text=Nguyên liệu')).toBeVisible()
  42  |       await expect(page.locator('text=Giá trị kho')).toBeVisible()
  43  |     })
  44  | 
  45  |     test('Navigate to ingredients via sidebar', async ({ page }) => {
  46  |       await page.click('text=Nguyên liệu')
  47  |       await expect(page.locator('th:text("Tên nguyên liệu")')).toBeVisible()
  48  |     })
  49  | 
  50  |     test('Create ingredient', async ({ page }) => {
  51  |       await page.click('text=Nguyên liệu')
  52  |       await page.click('button:has-text("Thêm")')
  53  |       await expect(page.locator('text=Thêm Nguyên Liệu')).toBeVisible()
  54  | 
  55  |       await page.locator('input').nth(0).fill('Ớt hiểm E2E')
  56  |       await page.locator('select').nth(0).selectOption('kg')
  57  |       await page.locator('select').nth(1).selectOption('Rau')
  58  |       await page.locator('input[type="number"]').nth(0).fill('50000')
  59  |       await page.locator('input[type="number"]').nth(1).fill('2')
  60  |       await page.click('button:has-text("OK")')
  61  | 
  62  |       await expect(page.locator('text=Thêm nguyên liệu thành công')).toBeVisible()
  63  |     })
  64  | 
  65  |     test('Navigate to suppliers', async ({ page }) => {
  66  |       await page.click('text=Nhà cung cấp')
  67  |       await expect(page.locator('th:text("Tên NCC")')).toBeVisible()
  68  |     })
  69  | 
  70  |     test('Create supplier', async ({ page }) => {
  71  |       await page.click('text=Nhà cung cấp')
  72  |       await page.click('button:has-text("Thêm")')
  73  | 
  74  |       await page.locator('input').nth(0).fill('NCC E2E Test')
  75  |       await page.locator('input').nth(1).fill('0999999999')
  76  |       await page.locator('input').nth(2).fill('123 Test Street')
  77  |       await page.click('button:has-text("OK")')
  78  | 
  79  |       await expect(page.locator('text=Thêm NCC thành công')).toBeVisible()
  80  |     })
  81  | 
  82  |     test('Create import order (nhập kho)', async ({ page }) => {
  83  |       await page.click('text=Nhập kho')
  84  |       await page.click('button:has-text("Tạo phiếu")')
  85  |       await expect(page.locator('text=Tạo Phiếu Nhập Kho')).toBeVisible()
  86  | 
  87  |       // Select supplier
  88  |       const supplierSelect = page.locator('select').first()
  89  |       await supplierSelect.selectOption({ index: 1 })
  90  | 
  91  |       // Select ingredient in first row
  92  |       const ingredientSelect = page.locator('table select').first()
  93  |       await ingredientSelect.selectOption({ index: 1 })
  94  | 
  95  |       // Fill quantity and price
  96  |       await page.locator('table input[type="number"]').nth(0).fill('10')
  97  |       await page.locator('table input[type="number"]').nth(1).fill('100000')
  98  | 
  99  |       await page.click('button:has-text("Lưu")')
  100 |       await expect(page.locator('text=Tạo phiếu nhập thành công')).toBeVisible()
  101 |     })
  102 | 
  103 |     test('Approve import order (duyệt phiếu nhập)', async ({ page }) => {
  104 |       await page.click('text=Nhập kho')
  105 |       await page.waitForTimeout(500)
  106 | 
  107 |       // Click first PENDING row
  108 |       const pendingRow = page.locator('tr:has-text("PENDING")').first()
  109 |       if (await pendingRow.isVisible()) {
  110 |         await pendingRow.click()
  111 |         await page.click('button:has-text("Duyệt")')
  112 |         await page.click('button:has-text("Yes")')
  113 |         await expect(page.locator('text=Đã duyệt phiếu nhập')).toBeVisible()
  114 |       }
  115 |     })
  116 | 
  117 |     test('Stock export (xuất kho)', async ({ page }) => {
  118 |       await page.click('text=Xuất kho')
  119 |       await page.click('button:has-text("Xuất kho")')
  120 |       await expect(page.locator('text=Xuất Kho')).toBeVisible()
  121 | 
  122 |       // Select ingredient
  123 |       const ingredientSelect = page.locator('select').nth(0)
  124 |       await ingredientSelect.selectOption({ index: 1 })
  125 | 
  126 |       await page.locator('input[type="number"]').fill('1')
  127 | 
  128 |       // Select reason
  129 |       const reasonSelect = page.locator('select').nth(1)
  130 |       await reasonSelect.selectOption('INTERNAL_USE')
  131 | 
  132 |       await page.locator('input').last().fill('E2E test export')
  133 |       await page.click('button:has-text("Xuất")')
  134 | 
```