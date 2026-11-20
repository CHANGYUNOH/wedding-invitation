import { useEffect, useRef, useState } from 'react'
import { asset } from '../lib/asset.js'
import { usePreview } from '../lib/wedding-context.jsx'
import { toast } from './Toast.jsx'
import './BgmToggle.css'

export default function BgmToggle({ src }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const preview = usePreview()

  // 청첩장을 열면 음악을 바로 튼다. 브라우저는 소리 나는 자동재생을 대부분 막으므로,
  // 막히면 화면을 처음 누르는 순간에 시작한다. 편집 페이지의 미리보기에서는 자동으로 틀지 않는다.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || preview) return
    const events = ['pointerdown', 'touchend', 'keydown']
    const stop = () => events.forEach((e) => window.removeEventListener(e, onGesture, true))
    const onGesture = (e) => {
      // 음악 버튼을 직접 누른 경우는 버튼이 처리한다.
      if (e.target instanceof Element && e.target.closest('.bgm')) return stop()
      // 화면을 미는 동작은 브라우저가 인정하지 않을 수 있어, 재생에 성공할 때까지 기다린다.
      audio.play().then(stop, () => {})
    }
    audio.play().catch(() => events.forEach((e) => window.addEventListener(e, onGesture, true)))
    return stop
  }, [src, preview])

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
