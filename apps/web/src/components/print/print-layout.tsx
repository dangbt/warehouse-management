import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth.store'

export interface PrintOrg {
  companyName?: string | null
  address?: string | null
  taxCode?: string | null
}

interface PrintLayoutProps {
  org?: PrintOrg
  /** Khối bên phải header (mẫu số, thông tư...). */
  formNote?: ReactNode
  /** Công cụ chỉ hiện trên màn hình (chọn mẫu, nút In...). */
  toolbar?: ReactNode
  children: ReactNode
}

/**
 * Khung in A4 dọc dùng chung cho mọi chứng từ: header đơn vị (tên/địa chỉ/MST từ cấu hình),
 * CSS @media print ẩn mọi thứ có class `no-print`. Nội dung chứng từ truyền qua children.
 */
export function PrintLayout({ org, formNote, toolbar, children }: PrintLayoutProps) {
  const canConfigure = useAuthStore((s) => s.hasPermission)('tax:manage')
  const missing = !org?.companyName || !org?.address || !org?.taxCode
  return (
    <div className="print-root">
      <div className="no-print print-toolbar">{toolbar}</div>
      {missing && (
        <div className="no-print print-config-warning" data-testid="print-config-warning">
          Chưa đủ thông tin đơn vị (tên, địa chỉ, MST) — header phiếu sẽ bị trống.{' '}
          {canConfigure ? (
            <Link to="/tax-settings">Mở cấu hình thông tin doanh nghiệp</Link>
          ) : (
            'Liên hệ quản trị viên để bổ sung.'
          )}
        </div>
      )}
      <article className="print-page">
        <header className="print-header">
          <div className="print-org">
            <div className="print-org-name">{org?.companyName || '………………………………'}</div>
            <div>Địa chỉ: {org?.address || '………………………………'}</div>
            <div>MST: {org?.taxCode || '………………'}</div>
          </div>
          {formNote && <div className="print-form-note">{formNote}</div>}
        </header>
        {children}
      </article>
    </div>
  )
}
