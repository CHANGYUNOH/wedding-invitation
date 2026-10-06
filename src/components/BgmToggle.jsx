import { useRef, useState } from 'react'
import { asset } from '../lib/asset.js'
import { toast } from './Toast.jsx'
import './BgmToggle.css'

export default function BgmToggle({ src }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  if (!src || failed) return null

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio.paused) {
      audio.pause()
      return
    }
    try {
      await audio.play()
    } catch (err) {
      console.warn('[wedding] 배경음악을 재생하지 못했습니다.', err)
      toast('배경음악을 재생할 수 없습니다.')
    }
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={asset(src)}
        loop
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setFailed(true)}
      />
      <button
        type="button"
        className={`bgm${playing ? ' is-playing' : ''}`}
        onClick={toggle}
        aria-label={playing ? '배경음악 끄기' : '배경음악 켜기'}
        aria-pressed={playing}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
            <path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
            <path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </button>
    </>
  )
}
