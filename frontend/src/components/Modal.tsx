import { useEffect, useRef } from 'react'
import type { ReactNode, CSSProperties } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  style?: CSSProperties
}

export default function Modal({ open, onClose, title, children, style }: ModalProps) {
  const mousedownOnBackdrop = useRef(false)
  const backdropRef = useRef<HTMLDivElement>(null)

  // Lock the actual scroll container (.main-content) and block wheel/touch on backdrop
  useEffect(() => {
    if (!open) return
    const main = document.querySelector('.main-content') as HTMLElement | null
    const prev = main?.style.overflow ?? ''
    if (main) main.style.overflow = 'hidden'

    const el = backdropRef.current
    const prevent = (e: Event) => { if (e.target === el) e.preventDefault() }
    el?.addEventListener('wheel', prevent, { passive: false })
    el?.addEventListener('touchmove', prevent, { passive: false })

    return () => {
      if (main) main.style.overflow = prev
      el?.removeEventListener('wheel', prevent)
      el?.removeEventListener('touchmove', prevent)
    }
  }, [open])

  if (!open) return null

  return (
    <div
      ref={backdropRef}
      className="modal-backdrop"
      onMouseDown={(e) => { mousedownOnBackdrop.current = e.target === e.currentTarget }}
      onClick={(e) => {
        if (e.target === e.currentTarget && mousedownOnBackdrop.current) onClose()
      }}
    >
      <div className="modal" style={style}>
        <h2 className="modal-title">{title}</h2>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  )
}
