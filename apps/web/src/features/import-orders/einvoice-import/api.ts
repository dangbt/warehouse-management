import { API_BASE, api } from '@/services/api'
import { useAuthStore } from '@/stores/auth.store'
import type { EinvoiceResult, MappingPayload } from './types'

/** Upload .xml/.zip hoá đơn điện tử (multipart) ⇒ kết quả đọc từng file. */
export async function uploadEinvoices(files: File[]): Promise<EinvoiceResult[]> {
  const form = new FormData()
  files.forEach((f) => form.append('files', f))
  const token = useAuthStore.getState().token
  const res = await fetch(`${API_BASE}/import-orders/einvoice/parse`, {
    method: 'POST',
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || 'Không đọc được hoá đơn')
  return data as EinvoiceResult[]
}

export function saveMappings(mappings: MappingPayload[]): Promise<{ saved: number }> {
  return api.post('/import-orders/einvoice/mappings', { mappings })
}

export function createSupplierFromSeller(s: { name: string; taxCode: string; address: string }): Promise<{ id: string; name: string; taxCode: string }> {
  return api.post('/suppliers', { name: s.name, tax_code: s.taxCode, address: s.address || undefined })
}
