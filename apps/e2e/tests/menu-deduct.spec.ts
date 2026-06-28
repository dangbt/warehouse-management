import { test, expect, request as pwRequest, APIRequestContext } from '@playwright/test'

// E2E cấp API: KiotViet order → auto trừ tồn theo cách cấu hình từng món
// (RECIPE / DIRECT / NONE / chưa cấu hình).
const API = 'http://localhost:3000/api/v1'
const RUN = Date.now()
const N = {
  meat: `E2E Thịt ${RUN}`,
  coca: `E2E Coca ${RUN}`,
  supplier: `E2E NCC Menu ${RUN}`,
  mPho: `E2E Phở ${RUN}`,
  mCoca: `E2E Nước ngọt ${RUN}`,
  mKhan: `E2E Khăn lạnh ${RUN}`,
  mUnknown: `E2E Món lạ ${RUN}`,
}

test.describe.serial('KiotViet auto-deduct theo mode (API)', () => {
  let ctx: APIRequestContext
  let token = ''
  const id: Record<string, string> = {}
  const H = () => ({ Authorization: `Bearer ${token}` })

  async function stockOf(name: string): Promise<number> {
    const r = await ctx.get(`${API}/ingredients?search=${encodeURIComponent(name)}&limit=100`, { headers: H() })
    const found = ((await r.json()).data as { name: string; currentStock: string }[]).find((i) => i.name === name)
    return found ? Number(found.currentStock) : NaN
  }

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext()
    const r = await ctx.post(`${API}/auth/login`, { data: { email: 'admin@wms.vn', password: '123456' } })
    token = (await r.json()).access_token
    expect(token).toBeTruthy()
  })
  test.afterAll(async () => ctx.dispose())

  test('Tạo NL + nhập + duyệt → tồn + lô', async () => {
    let r = await ctx.post(`${API}/ingredients`, { headers: H(), data: { name: N.meat, unit: 'kg', category: 'Thịt', cost_per_unit: 100000, min_stock: 0 } })
    id.meat = (await r.json()).id
    r = await ctx.post(`${API}/ingredients`, { headers: H(), data: { name: N.coca, unit: 'chai', category: 'Đồ uống', cost_per_unit: 8000, min_stock: 0 } })
    id.coca = (await r.json()).id
    r = await ctx.post(`${API}/suppliers`, { headers: H(), data: { name: N.supplier, phone: '0900000009' } })
    id.supplier = (await r.json()).id
    r = await ctx.post(`${API}/import-orders`, {
      headers: H(),
      data: { supplier_id: id.supplier, paid: true, items: [
        { ingredient_id: id.meat, quantity: 50, unit_price: 100000 },
        { ingredient_id: id.coca, quantity: 50, unit_price: 8000 },
      ] },
    })
    const orderId = (await r.json()).id
    r = await ctx.put(`${API}/import-orders/${orderId}/approve`, { headers: H(), data: {} })
    expect(r.ok()).toBeTruthy()
    expect(await stockOf(N.meat)).toBe(50)
    expect(await stockOf(N.coca)).toBe(50)
  })

  test('Sync-products tạo thực đơn + cấu hình mode', async () => {
    const r = await ctx.post(`${API}/kiotviet/sync-products`, {
      headers: H(),
      data: { products: [
        { id: `KV-${RUN}-1`, name: N.mPho, category: 'Món chính' },
        { id: `KV-${RUN}-2`, name: N.mCoca, category: 'Đồ uống' },
        { id: `KV-${RUN}-3`, name: N.mKhan, category: 'Khác' },
      ] },
    })
    expect((await r.json()).created).toBe(3)
    const menu = (await (await ctx.get(`${API}/menu-items`, { headers: H() })).json()) as { id: string; name: string }[]
    const find = (n: string) => menu.find((m) => m.name === n)!.id
    id.mPho = find(N.mPho)
    id.mCoca = find(N.mCoca)
    id.mKhan = find(N.mKhan)

    // Phở: RECIPE + công thức (1 phần = 0.2kg thịt)
    await ctx.put(`${API}/menu-items/${id.mPho}`, { headers: H(), data: { inventory_mode: 'RECIPE' } })
    await ctx.post(`${API}/recipes`, { headers: H(), data: { menu_item_id: id.mPho, name: N.mPho, serving_size: 1, ingredients: [{ ingredient_id: id.meat, quantity: 0.2, unit: 'kg' }] } })
    // Coca: DIRECT → ingredient Coca
    await ctx.put(`${API}/menu-items/${id.mCoca}`, { headers: H(), data: { inventory_mode: 'DIRECT', direct_ingredient_id: id.coca } })
    // Khăn lạnh: NONE
    await ctx.put(`${API}/menu-items/${id.mKhan}`, { headers: H(), data: { inventory_mode: 'NONE' } })
  })

  test('Sync order → trừ đúng RECIPE+DIRECT, bỏ qua NONE, gom chưa-cấu-hình', async () => {
    const beforeMeat = await stockOf(N.meat)
    const beforeCoca = await stockOf(N.coca)
    const r = await ctx.post(`${API}/kiotviet/sync`, {
      headers: H(),
      data: { orders: [{
        id: `ORD-${RUN}`, code: `HD-${RUN}`, totalAmount: 200000, orderDate: new Date().toISOString(),
        items: [
          { productName: N.mPho, quantity: 2, price: 65000 },
          { productName: N.mCoca, quantity: 3, price: 15000 },
          { productName: N.mKhan, quantity: 1, price: 3000 },
          { productName: N.mUnknown, quantity: 1, price: 50000 },
        ],
      }] },
    })
    const res = await r.json()
    expect(res.synced).toBe(1)
    expect(res.deducted).toBe(1)
    expect(res.unconfigured).toContain(N.mUnknown) // món chưa map menu_item
    expect(res.errors).toEqual([])

    // RECIPE: thịt -0.4 (0.2×2); DIRECT: coca -3; NONE: không trừ
    expect(await stockOf(N.meat)).toBeCloseTo(beforeMeat - 0.4, 3)
    expect(await stockOf(N.coca)).toBe(beforeCoca - 3)
  })
})
