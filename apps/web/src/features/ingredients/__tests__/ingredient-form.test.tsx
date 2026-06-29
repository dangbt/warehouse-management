import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { IngredientForm } from '../ingredient-form'

vi.mock('@/data', () => ({
  useIngredientGroups: () => ({ data: [], isLoading: false }),
  useIngredients: () => ({ data: [], isLoading: false }),
}))

describe('IngredientForm', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<IngredientForm open={false} mode="add" data={null} onClose={() => {}} />)
    expect(container.innerHTML).toBe('')
  })

  it('shows add title in add mode', () => {
    render(<IngredientForm open={true} mode="add" data={null} onClose={() => {}} />)
    expect(screen.getByText('🆕 Thêm Nguyên Liệu')).toBeInTheDocument()
  })

  it('shows edit title in edit mode', () => {
    render(
      <IngredientForm
        open={true}
        mode="edit"
        data={{ id: '1', name: 'Test', unit: 'kg', category: 'Thịt', cost_per_unit: 100, min_stock: 5 }}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText('✏️ Sửa Nguyên Liệu')).toBeInTheDocument()
  })

  it('pre-fills data in edit mode', () => {
    render(
      <IngredientForm
        open={true}
        mode="edit"
        data={{ id: '1', name: 'Thịt bò', unit: 'kg', category: 'Thịt', cost_per_unit: 450000, min_stock: 5 }}
        onClose={() => {}}
      />,
    )
    expect(screen.getByDisplayValue('Thịt bò')).toBeInTheDocument()
    expect(screen.getByDisplayValue('kg')).toBeInTheDocument()
  })

  it('calls onClose when Cancel clicked', () => {
    const fn = vi.fn()
    render(<IngredientForm open={true} mode="add" data={null} onClose={fn} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(fn).toHaveBeenCalled()
  })

  it('validates required fields', async () => {
    render(<IngredientForm open={true} mode="add" data={null} onClose={() => {}} onSave={vi.fn()} />)
    fireEvent.click(screen.getByText('OK'))
    await waitFor(() => {
      expect(screen.getAllByText('Bắt buộc').length).toBeGreaterThan(0)
    })
  })

  it('calls onSave with data when form is valid', async () => {
    const saveFn = vi.fn()
    render(<IngredientForm open={true} mode="add" data={null} onClose={() => {}} onSave={saveFn} />)

    // name is the only textbox
    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[0], { target: { value: 'New NL' } })

    // unit and category are comboboxes (WinSelect)
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'kg' } })
    fireEvent.change(selects[1], { target: { value: 'Thịt' } })

    // cost_per_unit and min_stock are spinbuttons
    const numbers = screen.getAllByRole('spinbutton')
    fireEvent.change(numbers[0], { target: { value: '100000' } })
    fireEvent.change(numbers[1], { target: { value: '5' } })

    fireEvent.click(screen.getByText('OK'))
    await waitFor(() => {
      expect(saveFn).toHaveBeenCalled()
    })
  })
})
