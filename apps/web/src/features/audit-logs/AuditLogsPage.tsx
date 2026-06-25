import { useState, useEffect, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { WinToolbar, WinDataGrid } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { api } from '@/services/api'
import { formatDateTime } from '@wms/shared'

interface AuditLog { id: string; user: { fullName: string } | null; action: string; resource: string; resourceId: string; oldValues: Record<string, unknown> | null; newValues: Record<string, unknown> | null; ipAddress: string; createdAt: string }

const columns: Column<AuditLog>[] = [
  { key: 'createdAt', header: 'Thời gian', width: 150, render: (r) => formatDateTime(r.createdAt) },
  { key: 'user', header: 'User', width: 120, render: (r) => r.user?.fullName || 'System' },
  { key: 'action', header: 'Action', width: 180 },
  { key: 'resource', header: 'Resource', width: 120 },
  { key: 'ipAddress', header: 'IP', width: 110 },
]

export function AuditLogsPage() {
  const [data, setData] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<AuditLog | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await api.get('/audit-logs?limit=100')
    setData(res.data); setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={fetchData} />
      </WinToolbar>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <WinDataGrid columns={columns} data={data} loading={loading} onRowDoubleClick={setDetail} pagination={{ page: 1, limit: 100, total: data.length }} />
        </div>
        {detail && (
          <div className="h-32 border-t border-win-grid-border bg-win-control p-2 overflow-auto text-[11px] shrink-0">
            <div className="font-semibold mb-1">Chi tiết: {detail.action}</div>
            {detail.oldValues && <div><span className="text-win-text-secondary">Old:</span> {JSON.stringify(detail.oldValues)}</div>}
            {detail.newValues && <div><span className="text-win-text-secondary">New:</span> {JSON.stringify(detail.newValues)}</div>}
            <div className="text-win-text-secondary mt-1">IP: {detail.ipAddress}</div>
          </div>
        )}
      </div>
    </div>
  )
}
