import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MatrixPicker } from '../matrix-picker'
import type { ProductDetail, ProductAttribute } from '@/data/use-products'

const attrs: ProductAttribute[] = [
  { id: 'a-c', name: 'Màu', code: 'COLOR', sort: 0, values: ['Đen', 'Trắng', 'Đỏ'].map((v, i) => ({ id: `c${i}`, attributeId: 'a-c', value: v, code: v, sort: i })) },
  { id: 'a-s', name: 'Size', code: 'SIZE', sort: 1, values: ['S', 'M'].map((v, i) => ({ id: `s${i}`, attributeId: 'a-s', value: v, code: v, sort: i })) },
]
const items = [0, 1, 2].flatMap((c) =>
  [0, 1].map((s) => ({
    id: `c${c}-s${s}`, name: `Áo c${c} s${s}`, sku: `AO-${c}${s}`, barcode: null, variantKey: null, unit: 'cái', currentStock: '10', costPerUnit: '100',
    salePrice: null, isActive: true, attributeValues: [{ attributeId: 'a-c', attributeValueId: `c${c}` }, { attributeId: 'a-s', attributeValueId: `s${s}` }],
  })),
)
const product = { id: 'p', code: 'AO', name: 'Áo', attributes: [{ attributeId: 'a-c', sort: 0 }, { attributeId: 'a-s', sort: 1 }], items } as unknown as ProductDetail

vi.mock('@/data/use-products', () => ({
  useProducts: () => ({ data: { data: [{ id: 'p', code: 'AO', name: 'Áo' }] } }),
  useProductAttributes: () => ({ data: attrs }),
  fetchProduct: () => Promise.resolve(product),
}))

describe('MatrixPicker bàn phím', () => {
  it('nhập SP 3×2 chỉ bằng bàn phím: Enter qua 6 ô, Enter ở ô cuối xác nhận', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(<MatrixPicker open mode="import" onClose={() => {}} onConfirm={onConfirm} />)
    await user.keyboard('{Enter}') // không làm gì khi chưa chọn SP
    await user.selectOptions(screen.getByTestId('matrix-product'), 'p')
    const first = await screen.findByTestId('matrix-qty-Đen-S')
    first.focus()
    for (const n of ['1', '2', '3', '4', '5']) await user.keyboard(`${n}{Enter}`)
    await user.keyboard('6{Enter}')
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1))
    const lines = onConfirm.mock.calls[0][0] as { itemId: string; quantity: number }[]
    expect(lines.map((l) => l.quantity)).toEqual([1, 2, 3, 4, 5, 6])
    expect(lines).toHaveLength(6)
  })
})
