import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Editor from './Editor.jsx'
import { builtConfig, loadLiveConfig } from '../lib/live-config.js'
import './editor.css'

// 지금 청첩장에 보이는 내용(편집 화면에서 저장해 둔 내용 포함)을 받아 온 뒤 편집을 시작한다.
// 받아 오지 못하거나 오래 걸리면 배포된 내용으로 시작한다.
// live: 지금 청첩장 내용을 실제로 받아 왔는지. 못 받았으면 작성하던 내용을 함부로 바꾸지 않는다.
const fallback = { current: builtConfig, live: false }
const waitLimit = new Promise((resolve) => setTimeout(() => resolve(fallback), 3000))
const loaded = loadLiveConfig().then(
  (current) => ({ current, live: true }),
  () => fallback,
)

Promise.race([loaded, waitLimit]).then(({ current, live }) => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <Editor current={current} currentIsLive={live} />
    </StrictMode>,
  )
})
