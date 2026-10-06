import { useEffect, useState } from 'react'
import './Toast.css'

const listeners = new Set()

export function toast(message) {
  listeners.forEach((show) => show(message))
}

export function Toaster() {
  const [item, setItem] = useState(null)

  useEffect(() => {
    let timer
    const show = (message) => {
      clearTimeout(timer)
      setItem({ message, key: Date.now() })
      timer = setTimeout(() => setItem(null), 2200)
    }
    listeners.add(show)
    return () => {
      listeners.delete(show)
      clearTimeout(timer)
    }
  }, [])

  return (
    <div className="toast-region" role="status" aria-live="polite">
      {item && (
        <div key={item.key} className="toast">
          {item.message}
        </div>
      )}
    </div>
  )
}
