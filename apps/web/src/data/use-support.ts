import { useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useToastStore } from '@/stores/toast.store'

export function useSendSupport() {
  return useMutation({
    mutationFn: (message: string) => api.post('/support', { message }),
    onSuccess: () => useToastStore.getState().success('Đã gửi yêu cầu hỗ trợ'),
    onError: (e: Error) => useToastStore.getState().error(e.message),
  })
}
