import { Component, StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { builtConfig, cachedLiveConfig, loadLiveConfig } from './lib/live-config.js'
import { WeddingProvider } from './lib/wedding-context.jsx'
import './styles/global.css'
import './styles/themes.css'

// 편집 페이지(/edit)의 미리보기 iframe은 ?preview 로 열리고, 부모 창이 보내주는 입력 내용으로 그린다.
const isPreview = new URLSearchParams(window.location.search).has('preview')

class PreviewBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  // 오류가 난 뒤 내용이 바뀌면 다시 그려본다.
  componentDidUpdate(prev) {
    if (this.state.failed && prev.version !== this.props.version) this.setState({ failed: false })
  }
  render() {
    return this.state.failed ? <p className="preview-error">입력 중인 내용으로 미리보기를 그리지 못했어요.</p> : this.props.children
  }
}

function PreviewRoot() {
  const [draft, setDraft] = useState(null)

  useEffect(() => {
    const onMessage = (e) => {
      if (e.origin !== window.location.origin || e.data?.type !== 'wedding:preview') return
      setDraft({ wedding: e.data.wedding, version: e.data.version })
    }
    window.addEventListener('message', onMessage)
    window.parent.postMessage({ type: 'wedding:preview-ready' }, window.location.origin)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  if (!draft) return null
  return (
    <PreviewBoundary version={draft.version}>
      <WeddingProvider wedding={draft.wedding} preview>
        <App />
      </WeddingProvider>
    </PreviewBoundary>
  )
}

// 하객용 화면. 편집 화면에서 저장해 둔 내용이 있으면 그 내용으로, 없으면 배포된 내용으로 그린다.
// 처음 온 하객에게 예전 내용이 잠깐 보였다가 바뀌지 않도록, 저장된 내용을 받을 때까지 잠깐(최대 1.5초) 기다린다.
const FIRST_PAINT_WAIT_MS = 1500

function LiveRoot() {
  const [wedding, setWedding] = useState(cachedLiveConfig)
  const [waited, setWaited] = useState(false)

  useEffect(() => {
    let alive = true
    const timer = setTimeout(() => alive && setWaited(true), FIRST_PAINT_WAIT_MS)
    loadLiveConfig()
      .then((next) => {
        // 내용이 같으면 화면을 다시 그리지 않는다.
        if (alive) setWedding((prev) => (prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
      })
      .catch((err) => console.warn('[wedding] 저장된 내용을 받지 못해 배포된 내용으로 보여줍니다.', err))
      .finally(() => alive && setWaited(true))
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [])

  const shown = wedding ?? (waited ? builtConfig : null)

  // 탭 제목은 빌드할 때 정해지므로, 저장된 공유 제목이 다르면 맞춰 준다.
  useEffect(() => {
    if (shown?.share?.title) document.title = shown.share.title
  }, [shown])

  if (!shown) return null
  return (
    <WeddingProvider wedding={shown}>
      <App />
    </WeddingProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isPreview ? <PreviewRoot /> : <LiveRoot />}
  </StrictMode>,
)
