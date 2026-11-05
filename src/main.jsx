import { Component, StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { wedding as publicWedding } from './config/wedding.js'
import { withPrivate } from './config/private.js'
import { WeddingProvider } from './lib/wedding-context.jsx'
import './styles/global.css'
import './styles/themes.css'

// 실명·계좌번호(wedding.private.json 또는 WEDDING_PRIVATE)는 빌드할 때 vite.config.js 가 넣어준다.
const wedding = withPrivate(publicWedding, __WEDDING_PRIVATE__)

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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isPreview ? (
      <PreviewRoot />
    ) : (
      <WeddingProvider wedding={wedding}>
        <App />
      </WeddingProvider>
    )}
  </StrictMode>,
)
