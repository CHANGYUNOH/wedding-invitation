import { useCallback, useEffect, useRef } from 'react'

// 실제 청첩장 페이지(./?preview)를 iframe으로 띄우고, 입력 중인 설정을 postMessage로 보낸다.
export default function PreviewFrame({ config, className }) {
  const ref = useRef(null)
  const latest = useRef(config)
  const version = useRef(0)
  latest.current = config

  const send = useCallback(() => {
    const win = ref.current?.contentWindow
    if (!win) return
    version.current += 1
    win.postMessage({ type: 'wedding:preview', wedding: latest.current, version: version.current }, window.location.origin)
  }, [])

  // iframe이 준비되면(새로고침 포함) 현재 내용을 보낸다.
  useEffect(() => {
    const onMessage = (e) => {
      if (e.origin !== window.location.origin || e.source !== ref.current?.contentWindow) return
      if (e.data?.type === 'wedding:preview-ready') send()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [send])

  // 입력이 잠시 멈추면 반영한다.
  useEffect(() => {
    const timer = setTimeout(send, 150)
    return () => clearTimeout(timer)
  }, [config, send])

  return <iframe ref={ref} className={className} src="./?preview" title="청첩장 미리보기" />
}
