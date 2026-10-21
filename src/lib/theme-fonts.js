import { themeFontsUrl } from '../themes/index.js'

// 템플릿 글꼴을 한 번만 불러온다. 하객용 페이지는 빌드 때 index.html 에 이미 넣어두므로 건너뛴다.
export function ensureThemeFonts(theme) {
  if (document.querySelector(`link[data-theme-fonts="${theme.id}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = themeFontsUrl(theme)
  link.dataset.themeFonts = theme.id
  document.head.appendChild(link)
}
