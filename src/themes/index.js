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
  {
    id: 'hanok',
    name: '전통 한지',
    desc: '한지 질감에 단청 빛 붉은색, 囍와 세로 이름의 전통 디자인',
    cover: 'circle',
    fonts: ['Song+Myung', 'Cormorant+Garamond:ital,wght@0,400;0,500;1,400'],
    themeColor: '#f7f1e6',
    swatch: { bg: '#f7f1e6', soft: '#f3e2d8', text: '#2e2a26', accent: '#a8332a' },
    typeface: { display: "'Song Myung', serif", text: "'Song Myung', serif" },
  },
  {
    id: 'garden',
    name: '보태니컬 가든',
    desc: '세이지 그린과 월계수 잎, 싱그러운 정원 디자인',
    cover: 'oval',
    fonts: ['Hahmlet:wght@300;400;600', 'Cormorant+Garamond:ital,wght@0,400;0,500;1,400'],
    themeColor: '#fbfcf8',
    swatch: { bg: '#fbfcf8', soft: '#e6eedf', text: '#2f3a2e', accent: '#6f8b5e' },
    typeface: { display: "'Cormorant Garamond', serif", text: "'Hahmlet', serif" },
  },
  {
    id: 'lavender',
    name: '파스텔 라벤더',
    desc: '연보랏빛 파스텔과 둥근 글꼴의 포근한 디자인',
    cover: 'oval',
    fonts: ['Gowun+Dodum', 'Quicksand:wght@400;500;600'],
    themeColor: '#fdfbff',
    swatch: { bg: '#fdfbff', soft: '#efe8f8', text: '#4a4458', accent: '#a08ac6' },
    typeface: { display: "'Quicksand', sans-serif", text: "'Gowun Dodum', sans-serif" },
  },
  {
    id: 'film',
    name: '레트로 필름',
    desc: '폴라로이드 사진과 손글씨, 따뜻한 필름 감성 디자인',
    cover: 'polaroid',
    fonts: ['Nanum+Pen+Script', 'Caveat:wght@400;600', 'Gowun+Batang:wght@400;700'],
    themeColor: '#faf5ec',
    swatch: { bg: '#faf5ec', soft: '#f5e6c8', text: '#4a3b2c', accent: '#c98a2b' },
    typeface: { display: "'Caveat', cursive", text: "'Nanum Pen Script', cursive" },
  },
  {
    id: 'magazine',
    name: '에디토리얼 매거진',
    desc: '잡지 표지처럼 큰 제목과 사진, 흑백에 레드 포인트',
    cover: 'magazine',
    fonts: ['Playfair+Display:ital,wght@0,400;0,700;1,400;1,700', 'Noto+Serif+KR:wght@400;700'],
    themeColor: '#ffffff',
    swatch: { bg: '#ffffff', soft: '#fbe7e5', text: '#111111', accent: '#d6352b' },
    typeface: { display: "'Playfair Display', serif", text: "'Noto Serif KR', serif" },
  },
]

export const DEFAULT_THEME = THEMES[0].id

export const themeOf = (id) => THEMES.find((t) => t.id === id) ?? THEMES[0]

export const themeFontsUrl = (theme) =>
  `https://fonts.googleapis.com/css2?${theme.fonts.map((f) => `family=${f}`).join('&')}&display=swap`
