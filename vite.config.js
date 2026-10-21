import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { wedding } from './src/config/wedding.js'
import { themeOf, themeFontsUrl } from './src/themes/index.js'

// index.html의 제목·OG 메타 태그와 디자인 템플릿(글꼴·색)을 src/config/wedding.js 값으로 채운다.
function weddingMeta() {
  const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  const fill = (html) => {
    const theme = themeOf(wedding.theme)
    const { title, description, image, siteUrl } = wedding.share
    // og:image는 절대 주소여야 해서 배포 주소와 합친다.
    const imageUrl = new URL(image, siteUrl).href
    return html
      .replaceAll('%META_TITLE%', escape(title))
      .replaceAll('%META_DESCRIPTION%', escape(description))
      .replaceAll('%META_IMAGE%', escape(imageUrl))
      .replaceAll('%META_URL%', escape(siteUrl))
      .replaceAll('%THEME_ID%', escape(theme.id))
      .replaceAll('%THEME_COLOR%', escape(theme.themeColor))
      .replaceAll('%THEME_FONTS%', escape(themeFontsUrl(theme)))
  }
  return {
    name: 'wedding-meta',
    // Vite가 <link href> 를 처리하기 전에 자리표시를 바꿔야 해서 먼저 실행한다.
    transformIndexHtml: { order: 'pre', handler: fill },
  }
}

const page = (file) => fileURLToPath(new URL(file, import.meta.url))

export default defineConfig({
  // 상대 경로로 빌드해서 GitHub Pages 하위 경로에서도 그대로 동작하게 한다.
  base: './',
  plugins: [react(), weddingMeta()],
  build: {
    rolldownOptions: {
      // 하객용 청첩장(index.html)과 정보 입력 페이지(edit.html)를 따로 빌드한다.
      input: { main: page('./index.html'), edit: page('./edit.html') },
    },
  },
})
