// 청첩장 디자인 템플릿 목록. wedding.js 의 theme 값으로 고른다.
// 색·글꼴·장식은 src/styles/themes.css, 표지 구성은 Cover.jsx 의 cover 값으로 정한다.
// 이 파일은 vite.config.js 에서도 읽으므로 브라우저 전용 코드를 넣지 않는다.

export const THEMES = [
  {
    id: 'minimal',
    name: '미니멀 화이트',
    desc: '넉넉한 여백과 세리프 글꼴의 단정한 디자인',
    cover: 'arch',
    fonts: ['Cormorant+Garamond:ital,wght@0,400;0,500;1,400', 'Gowun+Batang:wght@400;700'],
    themeColor: '#fbfaf7',
    // 편집 페이지의 디자인 고르기 카드에 쓰는 대표 색·글꼴
    swatch: { bg: '#ffffff', soft: '#f4efe9', text: '#3b3734', accent: '#a88f78' },
    typeface: { display: "'Cormorant Garamond', serif", text: "'Gowun Batang', serif" },
  },
  {
    id: 'floral',
    name: '로맨틱 플로럴',
    desc: '로즈 톤과 꽃 장식, 필기체가 어우러진 사랑스러운 디자인',
    cover: 'frame',
    fonts: ['Pinyon+Script', 'Cormorant+Garamond:ital,wght@0,400;0,500;1,400', 'Nanum+Myeongjo:wght@400;700'],
    themeColor: '#fffaf8',
    swatch: { bg: '#fffaf8', soft: '#f8e6e4', text: '#4b3a3a', accent: '#c4868a' },
    typeface: { display: "'Pinyon Script', cursive", text: "'Nanum Myeongjo', serif" },
  },
  {
    id: 'dark',
    name: '모던 나이트',
    desc: '깊은 밤빛 배경에 골드 포인트, 사진을 크게 보여주는 디자인',
    cover: 'full',
    fonts: ['Cinzel:wght@400;500;600', 'Noto+Serif+KR:wght@300;400;600'],
    themeColor: '#15171c',
    swatch: { bg: '#15171c', soft: '#29251b', text: '#ebe5d8', accent: '#c9a96b' },
    typeface: { display: "'Cinzel', serif", text: "'Noto Serif KR', serif" },
  },
  {
    id: 'modern',
    name: '볼드 타이포',
    desc: '큰 숫자와 굵은 고딕 글꼴의 감각적인 디자인',
    cover: 'type',
    fonts: ['Montserrat:wght@500;700;800'],
    themeColor: '#ffffff',
    swatch: { bg: '#ffffff', soft: '#f7e8e0', text: '#151515', accent: '#c0562f' },
    typeface: { display: "'Montserrat', sans-serif", text: "'Pretendard Variable', Pretendard, sans-serif" },
  },
]

export const DEFAULT_THEME = THEMES[0].id

export const themeOf = (id) => THEMES.find((t) => t.id === id) ?? THEMES[0]

export const themeFontsUrl = (theme) =>
  `https://fonts.googleapis.com/css2?${theme.fonts.map((f) => `family=${f}`).join('&')}&display=swap`
