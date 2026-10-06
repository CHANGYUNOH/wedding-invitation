import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { wedding } from './src/config/wedding.js'

// index.html의 제목·OG 메타 태그를 src/config/wedding.js 값으로 채운다.
function weddingMeta() {
  const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  return {
    name: 'wedding-meta',
    transformIndexHtml(html) {
      const { title, description, image, siteUrl } = wedding.share
      // og:image는 절대 주소여야 해서 배포 주소와 합친다.
      const imageUrl = new URL(image, siteUrl).href
      return html
        .replaceAll('%META_TITLE%', escape(title))
        .replaceAll('%META_DESCRIPTION%', escape(description))
        .replaceAll('%META_IMAGE%', escape(imageUrl))
        .replaceAll('%META_URL%', escape(siteUrl))
    },
  }
}

export default defineConfig({
  // 상대 경로로 빌드해서 GitHub Pages 하위 경로에서도 그대로 동작하게 한다.
  base: './',
  plugins: [react(), weddingMeta()],
})
