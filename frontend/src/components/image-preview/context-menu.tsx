import { createPortal } from 'react-dom'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface ImageContextMenuItem {
  key: string
  label: string
  onClick: () => void
  busy?: boolean
  disabled?: boolean
}

export interface ImageContextMenuState {
  open: boolean
  x: number
  y: number
}

export const CLOSED_IMAGE_CONTEXT_MENU: ImageContextMenuState = { open: false, x: 0, y: 0 }

export function ImageContextMenu(input: {
  state: ImageContextMenuState
  variant?: 'dark' | 'studio-light'
  title?: string
  items: ImageContextMenuItem[]
  onClose: () => void
}) {
  const { state, variant = 'studio-light', title, items, onClose } = input
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: state.x, top: state.y })

  useLayoutEffect(() => {
    if (!state.open) {
      return
    }

    const width = ref.current?.offsetWidth ?? 220
    const height = ref.current?.offsetHeight ?? 120
    const margin = 12
    const left = Math.max(margin, Math.min(state.x, window.innerWidth - width - margin))
    const top = Math.max(margin, Math.min(state.y, window.innerHeight - height - margin))
    setPosition({ left, top })
  }, [items.length, state.open, state.x, state.y, title])

  useEffect(() => {
    if (!state.open) {
      return undefined
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (ref.current?.contains(target)) {
        return
      }
      onClose()
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('pointerdown', handlePointerDown, true)
    window.addEventListener('keydown', handleEscape, true)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('keydown', handleEscape, true)
    }
  }, [onClose, state.open])

  if (!state.open) {
    return null
  }

  const shellClassName = variant === 'studio-light'
    ? 'fixed z-[220] w-56 overflow-hidden rounded-[1.6rem] border border-border/10 bg-bg-secondary/92 text-text-primary shadow-2xl backdrop-blur-xl'
    : 'fixed z-[220] w-56 overflow-hidden rounded-[1.6rem] border border-white/10 bg-slate-950/92 text-white/92 shadow-2xl backdrop-blur-xl'

  const titleClassName = variant === 'studio-light'
    ? 'border-border/10 text-text-secondary/55'
    : 'border-white/10 text-white/45'

  const buttonClassName = variant === 'studio-light'
    ? 'w-full rounded-[1.1rem] px-4 py-3 text-left text-sm text-text-primary transition hover:bg-bg-primary/60 disabled:opacity-60'
    : 'w-full rounded-[1.1rem] px-4 py-3 text-left text-sm text-white/90 transition hover:bg-white/10 disabled:opacity-60'

  return createPortal(
    <div
      ref={ref}
      className={shellClassName}
      style={position}
      onContextMenu={(event) => event.preventDefault()}
    >
      {title ? (
        <div className={`border-b px-4 py-3 ${titleClassName}`}>
          <div className="text-[10px] uppercase tracking-[0.24em]">
            {title}
          </div>
        </div>
      ) : null}
      <div className="p-2">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            className={buttonClassName}
            disabled={item.disabled || item.busy}
            onClick={item.onClick}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>,
    document.body,
  )
}
