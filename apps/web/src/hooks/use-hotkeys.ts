import { useEffect, useRef } from 'react'

export interface HotkeyBinding {
  /** Một hoặc nhiều tổ hợp: 'F2', 'Ctrl+S', 'Ctrl+Shift+S', 'Ctrl+Insert', 'Escape', 'ArrowDown'... */
  keys: string | string[]
  handler: (e: KeyboardEvent) => void
  /** true: vẫn chạy khi đang gõ trong input/textarea/select (mặc định chỉ tổ hợp có Ctrl/Cmd mới chạy). */
  allowInInput?: boolean
  /** false: không preventDefault (mặc định true). */
  preventDefault?: boolean
}

interface ParsedCombo {
  key: string
  ctrl: boolean
  shift: boolean
  alt: boolean
}

const KEY_ALIASES: Record<string, string> = { esc: 'escape', del: 'delete', ins: 'insert', up: 'arrowup', down: 'arrowdown' }

export function parseCombo(combo: string): ParsedCombo {
  const parts = combo.split('+').map((p) => p.trim().toLowerCase())
  const rawKey = parts[parts.length - 1]
  const mods = parts.slice(0, -1)
  return {
    key: KEY_ALIASES[rawKey] ?? rawKey,
    ctrl: mods.includes('ctrl') || mods.includes('cmd') || mods.includes('meta'),
    shift: mods.includes('shift'),
    alt: mods.includes('alt'),
  }
}

export function matchesCombo(e: KeyboardEvent, combo: string): boolean {
  const c = parseCombo(combo)
  return e.key.toLowerCase() === c.key && (e.ctrlKey || e.metaKey) === c.ctrl && e.shiftKey === c.shift && e.altKey === c.alt
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

/**
 * Đăng ký phím tắt toàn cục (window keydown). Khi đang gõ trong input chỉ các tổ hợp có Ctrl/Cmd
 * (hoặc binding đặt `allowInInput`) mới chạy — phím thường vẫn gõ bình thường.
 */
export function useHotkeys(bindings: HotkeyBinding[], enabled = true) {
  const ref = useRef(bindings)
  useEffect(() => {
    ref.current = bindings
  })

  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (e: KeyboardEvent) => {
      const typing = isTypingTarget(e.target)
      for (const b of ref.current) {
        const combos = Array.isArray(b.keys) ? b.keys : [b.keys]
        const hit = combos.find((c) => matchesCombo(e, c))
        if (!hit) continue
        if (typing && !b.allowInInput && !parseCombo(hit).ctrl) continue
        if (b.preventDefault !== false) e.preventDefault()
        b.handler(e)
        return
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
