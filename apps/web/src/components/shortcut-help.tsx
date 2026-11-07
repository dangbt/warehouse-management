import { useState } from 'react'
import { Keyboard } from 'lucide-react'
import { WinDialog } from '@wms/ui-winforms'
import { useHotkeys } from '@/hooks/use-hotkeys'

const SECTIONS: { title: string; items: [string, string][] }[] = [
  {
    title: 'Danh sách',
    items: [
      ['F2', 'Thêm mới'],
      ['F3 / Ctrl+F', 'Tìm kiếm'],
      ['F4 / Enter', 'Mở / sửa dòng đang chọn'],
      ['Delete', 'Xoá / huỷ (có xác nhận)'],
      ['Ctrl+D', 'Nhân bản chứng từ'],
      ['↑ / ↓', 'Chọn dòng trước / sau'],
    ],
  },
  {
    title: 'Form chứng từ',
    items: [
      ['Ctrl+S', 'Lưu'],
      ['Ctrl+Shift+S', 'Lưu và thêm mới'],
      ['Esc', 'Đóng (hỏi nếu có thay đổi chưa lưu)'],
      ['Ctrl+Insert', 'Thêm dòng'],
      ['Ctrl+Delete', 'Xoá dòng'],
      ['Enter (trong lưới)', 'Sang ô kế tiếp; hết dòng cuối thì thêm dòng'],
    ],
  },
  { title: 'Chung', items: [['F1', 'Bảng phím tắt này']] },
]

/** Bảng tra cứu phím tắt — mở bằng F1 (gắn một lần trong layout). */
export function ShortcutHelp() {
  const [open, setOpen] = useState(false)
  useHotkeys([{ keys: 'F1', allowInInput: true, handler: () => setOpen((v) => !v) }])
  return (
    <WinDialog title="Phím tắt" icon={<Keyboard size={16} strokeWidth={1.75} />} open={open} onClose={() => setOpen(false)} width={520}>
      <div data-testid="shortcut-help" className="space-y-3 text-win-base">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <div className="font-semibold mb-1">{s.title}</div>
            <table className="w-full">
              <tbody>
                {s.items.map(([k, d]) => (
                  <tr key={k} className="border-b border-win-grid-border">
                    <td className="py-1 pr-3 w-[190px]">
                      <kbd className="px-1.5 py-0.5 border border-win-button-border bg-win-button text-win-xs">{k}</kbd>
                    </td>
                    <td className="py-1">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </WinDialog>
  )
}
