import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Editor from './Editor.jsx'
import { builtConfig, loadLiveConfig } from '../lib/live-config.js'
import './editor.css'

// 지금 청첩장에 보이는 내용(편집 화면에서 저장해 둔 내용 포함)을 받아 온 뒤 편집을 시작한다.
// 받아 오지 못하거나 오래 걸리면 배포된 내용으로 시작한다.
const waitLimit = new Promise((resolve) => setTimeout(() => resolve(builtConfig), 3000))

Promise.race([loadLiveConfig().catch(() => builtConfig), waitLimit]).then((current) => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <Editor current={current} />
    </StrictMode>,
  )
})
