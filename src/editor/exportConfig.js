// 입력 내용을 src/config/wedding.js 파일 내용으로 바꾼다.
// 사진(cover.image, gallery)은 npm run photos 결과를 그대로 쓰도록 import 줄을 유지한다.
import { finalize } from './draft.js'
import { THEMES } from '../themes/index.js'

const INDENT = '  '
const MAX_INLINE = 100

function str(s) {
  return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n')}'`
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

// 짧은 값은 한 줄로, 긴 값은 여러 줄로 쓴다.
function js(value, depth = 0) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'string') return str(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)

  const pad = INDENT.repeat(depth + 1)
  const end = INDENT.repeat(depth)
  if (Array.isArray(value)) {
    if (!value.length) return '[]'
    const items = value.map((v) => js(v, depth + 1))
    const inline = `[${items.join(', ')}]`
    if (value.every((v) => !isPlainObject(v) && !Array.isArray(v)) && inline.length + depth * 2 <= MAX_INLINE && value.length <= 3) {
      return inline
    }
    return `[\n${items.map((i) => `${pad}${i},`).join('\n')}\n${end}]`
  }
  const entries = Object.entries(value).map(([k, v]) => [k, js(v, depth + 1)])
  const inline = `{ ${entries.map(([k, v]) => `${k}: ${v}`).join(', ')} }`
  const simple = Object.values(value).every((v) => !isPlainObject(v) && !(Array.isArray(v) && v.length))
  if (simple && inline.length + depth * 2 <= MAX_INLINE) return inline
  return `{\n${entries.map(([k, v]) => `${pad}${k}: ${v},`).join('\n')}\n${end}}`
}

const field = (key, value) => `${INDENT}${key}: ${js(value, 1)},`

export function toWeddingJs(draft, now = new Date()) {
  const d = finalize(draft)
  const stamp = now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' })
  return [
    '// 청첩장의 모든 문구·정보는 이 파일에서 수정합니다.',
    `// 정보 입력 페이지(/edit)에서 ${stamp}에 내보낸 파일입니다.`,
    '// 이미지·음악 경로는 public/ 폴더 기준 상대 경로입니다.',
    '// 커버·갤러리 사진은 photos/ 폴더에 원본을 넣으면 자동으로 줄여서 들어갑니다 (README 참고).',
    "import { photos } from './photos.generated.js'",
    '',
    'export const wedding = {',
    `  // 디자인 템플릿: ${THEMES.map((t) => `'${t.id}'(${t.name})`).join(', ')}`,
    field('theme', d.theme),
    "  // 이름 표기 순서: 'groom-first'(신랑 먼저) 또는 'bride-first'(신부 먼저)",
    field('hostOrder', d.hostOrder),
    '  // 돌아가신 부모님은 fatherDeceased·motherDeceased 를 true 로 두면 이름 앞에 故 가 붙습니다.',
    field('groom', d.groom),
    field('bride', d.bride),
    '',
    '  // 한국 시간(+09:00) 기준으로 적어주세요.',
    field('datetime', d.datetime),
    '',
    field('venue', d.venue),
    '',
    '  cover: {',
    "    image: photos.cover ?? 'images/cover.svg',",
    `    caption: ${js(d.cover.caption)},`,
    '  },',
    '',
    field('greeting', d.greeting),
    '',
    '  // photos/gallery/ 의 사진이 파일 이름순으로 들어갑니다.',
    '  gallery: photos.gallery,',
    '',
    '  // kakaopay: 카카오페이 송금 링크가 있으면 버튼이 함께 표시됩니다.',
    field('accounts', d.accounts),
    '',
    '  // 파일을 public/audio/ 에 넣고 경로를 적어주세요. 비워두면 음악 버튼이 숨겨집니다.',
    field('bgm', d.bgm),
    '',
    '  // image: 공유 카드 이미지 (JPG/PNG). 바꾸면 ?v= 뒤 숫자를 올려주세요.',
    '  // siteUrl: 배포한 청첩장 주소. 링크를 카톡방에 직접 붙여넣었을 때의 미리보기에 쓰입니다.',
    field('share', d.share),
    '}',
    '',
  ].join('\n')
}
