import { create } from 'zustand'
import { translateApiMessage } from '@/utils/api-error-messages'

interface Toast {
  id: number
  type: 'success' | 'error'
  message: string
}

interface ToastState {
  toasts: Toast[]
  success: (message: string) => void
  error: (message: string) => void
  remove: (id: number) => void
}

let _id = 0

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  success: (message) => {
    const id = ++_id
    set((s) => ({ toasts: [...s.toasts, { id, type: 'success', message }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3000)
  },
  error: (rawMessage) => {
    const message = translateApiMessage(rawMessage)
    const id = ++_id
    set((s) => ({ toasts: [...s.toasts, { id, type: 'error', message }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 5000)
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
