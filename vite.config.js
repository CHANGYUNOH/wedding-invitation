import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { wedding as publicWedding } from './src/config/wedding.js'
import { withPrivate } from './src/config/private.js'
import { themeOf, themeFontsUrl } from './src/themes/index.js'

// 실명·계좌번호는 git에 올리지 않는다. Vercel에서는 WEDDING_PRIVATE 환경변수(JSON),
// 내 PC에서는 프로젝트 폴더의 wedding.private.json 에서 읽어 wedding.js 위에 덮어쓴다.
function loadPrivate() {
  const file = fileURLToPath(new URL('./wedding.private.json', import.meta.url))
  const [source, text] = process.env.WEDDING_PRIVATE
    ? ['WEDDING_PRIVATE 환경변수', process.env.WEDDING_PRIVATE]
    : existsSync(file)
      ? ['wedding.private.json', readFileSync(file, 'utf8')]
      : []
  if (!source) {
    console.log('[wedding] 비공개 정보 없음 — wedding.js 의 값을 그대로 씁니다.')
    return null
  }
  try {
    const data = JSON.parse(text)
    console.log(`[wedding] ${source}의 비공개 정보를 적용합니다 (${Object.keys(data).join(', ')}).`)
    return data
  } catch (e) {
    // 잘못된 값으로 샘플 이름이 배포되지 않도록 빌드를 멈춘다.
    throw new Error(`[wedding] ${source}의 JSON 형식이 올바르지 않습니다: ${e.message}`)
  }
}

const privateWedding = loadPrivate()
const wedding = withPrivate(publicWedding, privateWedding)

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
  // src/main.jsx 가 wedding.js 위에 덮어쓸 비공개 정보
  define: { __WEDDING_PRIVATE__: JSON.stringify(privateWedding) },
  build: {
    rolldownOptions: {
      // 하객용 청첩장(index.html)과 정보 입력 페이지(edit.html)를 따로 빌드한다.
      input: { main: page('./index.html'), edit: page('./edit.html') },
    },
  },
})
