import { test, expect, request as pwRequest, APIRequestContext } from '@playwright/test'

// E2E cấp API cho feature mới (Bán thành phẩm + Gom nhóm + Quy đổi đơn vị).
// Frontend cho BTP chưa làm nên test trực tiếp qua REST API.
const API = 'http://localhost:3000/api/v1'
const RUN = Date.now()

const N = {
  group: `E2E Nhóm Ba rọi ${RUN}`,
  song: `E2E Ba rọi sống ${RUN}`,
  chin: `E2E Ba rọi chín ${RUN}`,
  nuong: `E2E Ba rọi nướng ${RUN}`,
  drink: `E2E Nước ngọt ${RUN}`,
  supplier: `E2E NCC BTP ${RUN}`,
}

test.describe.serial('BTP / Nhóm / Quy đổi đơn vị (API)', () => {
  let ctx: APIRequestContext
  let token = ''
  const id: Record<string, string> = {}

  const H = () => ({ Authorization: `Bearer ${token}` })
  const num = (v: unknown) => Number(v)

  async function stockOf(name: string): Promise<number> {
    const r = await ctx.get(`${API}/ingredients?search=${encodeURIComponent(name)}&limit=100`, { headers: H() })
    const body = await r.json()
    const found = (body.data as { name: string; currentStock: string }[]).find((i) => i.name === name)
    return found ? num(found.currentStock) : NaN
  }

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext()
    const r = await ctx.post(`${API}/auth/login`, { data: { email: 'admin@wms.vn', password: '123456' } })
    expect(r.ok()).toBeTruthy()
    token = (await r.json()).access_token
    expect(token).toBeTruthy()
  })

  test.afterAll(async () => {
    await ctx.dispose()
  })

  test('TC-GRP: tạo nhóm nguyên liệu (base_unit kg)', async () => {
    const r = await ctx.post(`${API}/ingredient-groups`, {
      headers: H(),
      data: { name: N.group, base_unit: 'kg', min_stock: 5 },
    })
    expect(r.status()).toBe(201)
    id.group = (await r.json()).id
    expect(id.group).toBeTruthy()
  })

  test('Tạo NL sống + nhập + duyệt → tồn 10kg, có lô', async () => {
    // ba rọi sống (NL gốc, base_factor 1)
    let r = await ctx.post(`${API}/ingredients`, {
      headers: H(),
      data: { name: N.song, unit: 'kg', category: 'Thịt', cost_per_unit: 120000, min_stock: 1, group_id: id.group, base_factor: 1 },
    })
    expect(r.status()).toBe(201)
    id.song = (await r.json()).id

    // nhà cung cấp
    r = await ctx.post(`${API}/suppliers`, { headers: H(), data: { name: N.supplier, phone: '0900000001' } })
    expect(r.status()).toBe(201)
    id.supplier = (await r.json()).id

    // phiếu nhập 10kg @120k, đã trả
    r = await ctx.post(`${API}/import-orders`, {
      headers: H(),
      data: { supplier_id: id.supplier, paid: true, items: [{ ingredient_id: id.song, quantity: 10, unit_price: 120000 }] },
    })
    expect(r.status()).toBe(201)
    id.order = (await r.json()).id

    // duyệt → cộng tồn + tạo lô
    r = await ctx.put(`${API}/import-orders/${id.order}/approve`, { headers: H(), data: {} })
    expect(r.ok()).toBeTruthy()
    expect(await stockOf(N.song)).toBe(10)
  })

  test('Tạo BTP chín/nướng (nhóm + nguồn + yield + base_factor)', async () => {
    let r = await ctx.post(`${API}/ingredients`, {
      headers: H(),
      data: {
        name: N.chin,
        unit: 'phần',
        category: 'Thịt',
        cost_per_unit: 0,
        min_stock: 0,
        group_id: id.group,
        base_factor: 0.22,
        source_ingredient_id: id.song,
        yield_ratio: 4,
      },
    })
    expect(r.status()).toBe(201)
    id.chin = (await r.json()).id

    r = await ctx.post(`${API}/ingredients`, {
      headers: H(),
      data: {
        name: N.nuong,
        unit: 'phần',
        category: 'Thịt',
        cost_per_unit: 0,
        min_stock: 0,
        group_id: id.group,
        base_factor: 0.25,
        source_ingredient_id: id.song,
        yield_ratio: 4,
      },
    })
    expect(r.status()).toBe(201)
    id.nuong = (await r.json()).id
  })

  test('TC-PRO: chế biến 1kg sống → 4 phần chín (đúng yield), giá vốn 30k', async () => {
    let r = await ctx.post(`${API}/processing`, {
      headers: H(),
      data: { source_ingredient_id: id.song, source_qty: 1, output_ingredient_id: id.chin },
    })
    expect(r.status()).toBe(201)
    const proc = await r.json()
    id.proc1 = proc.id
    expect(num(proc.expectedQty)).toBe(4) // 1kg × yield 4

    r = await ctx.post(`${API}/processing/${id.proc1}/complete`, { headers: H(), data: {} })
    expect(r.ok()).toBeTruthy()
    const res = await r.json()
    expect(res.outputCost).toBe(30000) // 120000 / 4

    // tồn 2 lớp: sống 10→9, chín 0→4
    expect(await stockOf(N.song)).toBe(9)
    expect(await stockOf(N.chin)).toBe(4)
  })

  test('TC-PRO: hao hụt 1kg → 3 phần nướng, giá vốn 40k', async () => {
    let r = await ctx.post(`${API}/processing`, {
      headers: H(),
      data: { source_ingredient_id: id.song, source_qty: 1, output_ingredient_id: id.nuong, output_qty: 3 },
    })
    expect(r.status()).toBe(201)
    id.proc2 = (await r.json()).id

    r = await ctx.post(`${API}/processing/${id.proc2}/complete`, { headers: H(), data: {} })
    expect(r.ok()).toBeTruthy()
    expect((await r.json()).outputCost).toBe(40000) // 120000 / 3

    expect(await stockOf(N.song)).toBe(8)
    expect(await stockOf(N.nuong)).toBe(3)
  })

  test('TC-PRO: chế biến vượt tồn nguồn → báo lỗi', async () => {
    let r = await ctx.post(`${API}/processing`, {
      headers: H(),
      data: { source_ingredient_id: id.song, source_qty: 999, output_ingredient_id: id.chin },
    })
    expect(r.status()).toBe(201)
    const pid = (await r.json()).id
    r = await ctx.post(`${API}/processing/${pid}/complete`, { headers: H(), data: {} })
    expect(r.status()).toBe(400)
    expect(JSON.stringify(await r.json())).toContain('Không đủ tồn')
  })

  test('TC-GRP: báo cáo tồn nhóm tự quy đổi phần→kg', async () => {
    const r = await ctx.get(`${API}/reports/stock-summary`, { headers: H() })
    expect(r.ok()).toBeTruthy()
    const body = await r.json()
    const grp = (body.groups as { name: string; baseUnit: string; totalStock: number; items: unknown[] }[]).find((g) => g.name === N.group)
    expect(grp).toBeTruthy()
    expect(grp!.baseUnit).toBe('kg')
    // sống 8×1 + chín 4×0.22 + nướng 3×0.25 = 8 + 0.88 + 0.75 = 9.63
    expect(grp!.totalStock).toBeCloseTo(9.63, 2)
    expect(grp!.items.length).toBe(3)
  })

  test('TC-UOM: nhập theo thùng (factor 24) → tồn quy ra chai', async () => {
    // NL tính theo chai
    let r = await ctx.post(`${API}/ingredients`, {
      headers: H(),
      data: { name: N.drink, unit: 'chai', category: 'Đồ uống', cost_per_unit: 8000, min_stock: 0 },
    })
    expect(r.status()).toBe(201)
    id.drink = (await r.json()).id

    // nhập 5 thùng × 24 chai/thùng
    r = await ctx.post(`${API}/import-orders`, {
      headers: H(),
      data: {
        supplier_id: id.supplier,
        paid: true,
        items: [{ ingredient_id: id.drink, quantity: 5, unit: 'thùng', factor: 24, unit_price: 8000 }],
      },
    })
    expect(r.status()).toBe(201)
    const orderId = (await r.json()).id
    r = await ctx.put(`${API}/import-orders/${orderId}/approve`, { headers: H(), data: {} })
    expect(r.ok()).toBeTruthy()

    expect(await stockOf(N.drink)).toBe(120) // 5 × 24
  })
})
