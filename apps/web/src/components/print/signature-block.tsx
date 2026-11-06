export const IMPORT_SIGNATURES = ['Người lập phiếu', 'Người giao hàng', 'Thủ kho', 'Kế toán trưởng', 'Giám đốc'] as const

interface SignatureBlockProps {
  roles?: readonly string[]
}

/** Khối chữ ký cuối chứng từ; không bị ngắt trang giữa chừng. */
export function SignatureBlock({ roles = IMPORT_SIGNATURES }: SignatureBlockProps) {
  return (
    <div className="print-signatures">
      {roles.map((role) => (
        <div key={role} className="print-signature">
          <div className="print-signature-role">{role}</div>
          <div className="print-signature-hint">(Ký, họ tên)</div>
        </div>
      ))}
    </div>
  )
}
