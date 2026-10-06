import { useEffect, useRef, useState } from 'react'
import './Lightbox.css'

const SWIPE_THRESHOLD = 50

export default function Lightbox({ images, index, onChange, onClose }) {
  const ref = useRef(null)
  const touch = useRef(null)
  const [dragX, setDragX] = useState(0)
  const open = index !== null

  useEffect(() => {
    const dialog = ref.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const go = (next) => {
    if (next >= 0 && next < images.length) onChange(next)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') go(index - 1)
    if (e.key === 'ArrowRight') go(index + 1)
  }

  const onTouchStart = (e) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, horizontal: null }
  }

  const onTouchMove = (e) => {
    const t = touch.current
    if (!t) return
    const dx = e.touches[0].clientX - t.x
    const dy = e.touches[0].clientY - t.y
    if (t.horizontal === null && Math.abs(dx) + Math.abs(dy) > 8) t.horizontal = Math.abs(dx) > Math.abs(dy)
    if (t.horizontal) {
      // 처음·마지막 사진에서는 끌리는 거리를 줄여 끝이라는 느낌을 준다
      const atEdge = (dx > 0 && index === 0) || (dx < 0 && index === images.length - 1)
      setDragX(atEdge ? dx / 3 : dx)
    }
  }

  const onTouchEnd = () => {
    if (dragX <= -SWIPE_THRESHOLD) go(index + 1)
    if (dragX >= SWIPE_THRESHOLD) go(index - 1)
    touch.current = null
    setDragX(0)
  }

  return (
    <dialog
      ref={ref}
      className="lightbox"
      aria-label="사진 크게 보기"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onKeyDown={onKeyDown}
    >
      {open && (
        <>
          <div
            className="lightbox__viewport"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchEnd}
          >
            <div
              className={`lightbox__track${dragX ? ' is-dragging' : ''}`}
              style={{ transform: `translateX(calc(${-index * 100}% + ${dragX}px))` }}
            >
              {images.map((src, i) => (
                <div key={src} className="lightbox__slide">
                  {Math.abs(i - index) <= 1 && <img src={src} alt={`사진 ${i + 1}`} draggable="false" />}
                </div>
              ))}
            </div>
          </div>

          <p className="lightbox__counter">
            {index + 1} / {images.length}
          </p>

          <button type="button" className="lightbox__close" onClick={onClose} aria-label="닫기">
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {index > 0 && (
            <button type="button" className="lightbox__nav lightbox__nav--prev" onClick={() => go(index - 1)} aria-label="이전 사진">
              <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
          {index < images.length - 1 && (
            <button type="button" className="lightbox__nav lightbox__nav--next" onClick={() => go(index + 1)} aria-label="다음 사진">
              <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
                <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </>
      )}
    </dialog>
  )
}
