// 편집 페이지에서 다루는 입력 내용(draft). src/config/wedding.js 와 같은 모양이며,
// 사진처럼 파일로 관리하는 값(cover.image, gallery)만 빠져 있다.
import { kstParts, formatKoreanDate, formatKoreanTime } from '../lib/date.js'
import { orderedHosts } from '../lib/hosts.js'
import { DEFAULT_THEME } from '../themes/index.js'

const STORAGE_KEY = 'wedding-editor:draft'

export const GREETING_TEMPLATES = [
  [
    '서로가 마주보며 다져온 사랑을',
    '이제 함께 한 곳을 바라보며',
    '걸어갈 수 있는 큰 사랑으로 키우고자 합니다.',
    '',
    '저희 두 사람이 사랑의 이름으로',
    '지켜나갈 수 있게 앞날을 축복해 주시면',
    '감사하겠습니다.',
  ],
  [
    '서로 다른 길을 걸어온 두 사람이',
    '이제 같은 길을 함께 걸어가려 합니다.',
    '',
    '저희의 새로운 시작을',
    '가까이에서 축복해 주시면',
    '더없는 기쁨으로 간직하겠습니다.',
  ],
  [
    '햇살처럼 따뜻한 사람을 만나',
    '평생을 함께하기로 약속했습니다.',
    '',
    '귀한 걸음 하시어',
    '저희의 첫걸음을 축복해 주세요.',
  ],
]

const person = (relation) => ({
  name: '',
  shortName: '',
  father: '',
  fatherDeceased: false,
  mother: '',
  motherDeceased: false,
  relation,
})
const accountRows = (self) =>
  [self, '아버지', '어머니'].map((role) => ({ role, name: '', bank: '', number: '', kakaopay: '' }))

// 빈 양식. 음악·공유 이미지·배포 주소처럼 화면에서 고치지 않는 값은 지금 설정에서 가져온다.
export function blankDraft(base) {
  return {
    theme: DEFAULT_THEME,
    hostOrder: 'groom-first',
    groom: person('아들'),
    bride: person('딸'),
    datetime: '',
    venue: {
      name: '',
      hall: '',
      address: '',
      tel: '',
      lat: null,
      lng: null,
      naverMapUrl: '',
      transport: ['지하철', '버스', '자가용'].map((title) => ({ title, lines: [] })),
    },
    cover: { caption: 'WE ARE GETTING MARRIED' },
    greeting: { title: '초대합니다', message: GREETING_TEMPLATES[0] },
    accounts: { groom: accountRows('신랑'), bride: accountRows('신부') },
    // bgm: 음악 경로(기본 제공 곡·직접 적은 경로) 또는 'upload'(첨부한 파일), '' 이면 음악 없음
    bgm: base.bgm,
    bgmFile: null, // 첨부한 음악 { id, name, ext, duration }
    share: { title: '', description: '', image: base.share.image, siteUrl: base.share.siteUrl },
    // 사진. 새로 첨부한 사진은 보관소 id(문자열, 실제 파일은 media.js 가 IndexedDB에 보관),
    // 이미 청첩장에 올라가 있는 사진은 { src, thumb } 로 적는다. cover 가 null 이면 지금 표지를 그대로 쓴다.
    // share: 카카오톡 공유 카드 사진. null 이면 지금 공유 사진(share.image)을 그대로 쓴다.
    photos: { cover: null, gallery: [], share: null },
  }
}

// 청첩장 설정의 갤러리 목록('경로' 또는 { src, thumb })을 편집용 { src, thumb } 목록으로 바꾼다.
export const siteGallery = (list) =>
  (Array.isArray(list) ? list : [])
    .map((p) => (typeof p === 'string' ? { src: p, thumb: p } : { src: p?.src, thumb: p?.thumb ?? p?.src }))
    .filter((p) => typeof p.src === 'string' && p.src)

// 지금 청첩장 설정을 편집용으로 옮긴다. 예전 설정에 없던 항목은 빈 양식 값으로 채운다.
// (작성하던 내용을 넣으면 사진 목록은 그대로 두고, 청첩장 설정을 넣으면 그 갤러리로 시작한다)
export function draftFromConfig(config) {
  const blank = blankDraft(config)
  const { gallery, cover, ...rest } = structuredClone(config)
  // 공유 문구가 자동 문구와 같으면 비워서, 이름·날짜를 고칠 때 함께 바뀌게 한다.
  const auto = autoShareText({ ...blank, ...rest })
  const share = { ...blank.share, ...rest.share }
  if (share.title === auto.title) share.title = ''
  if (share.description === auto.description) share.description = ''
  return {
    ...blank,
    ...rest,
    share,
    groom: { ...blank.groom, ...rest.groom },
    bride: { ...blank.bride, ...rest.bride },
    venue: { ...blank.venue, ...rest.venue },
    cover: { caption: cover?.caption ?? blank.cover.caption },
    photos: rest.photos ? { share: null, ...rest.photos } : { cover: null, gallery: siteGallery(gallery), share: null },
    accounts: {
      groom: rest.accounts.groom.map((a) => ({ kakaopay: '', ...a })),
      bride: rest.accounts.bride.map((a) => ({ kakaopay: '', ...a })),
    },
  }
}

// 작성 중인 내용에서 비어 있는 칸만 base(지금 청첩장 내용)의 값으로 채운다. 이미 적은 값은 건드리지 않는다.
// 디자인·사진·음악과, 비워두면 자동으로 만들어지는 공유 문구는 그대로 둔다.
// 돌려주는 값: { draft, filled } — filled 는 채운 칸의 수.
export function fillBlanks(draft, base) {
  let filled = 0
  const text = (mine, theirs) => {
    if (typeof mine === 'string' ? mine.trim() : mine != null) return mine
    if (typeof theirs === 'string' ? !theirs.trim() : theirs == null) return mine
    filled++
    return theirs
  }
  const list = (mine, theirs, hasContent) => {
    if (mine.some(hasContent) || !theirs.some(hasContent)) return mine
    filled++
    return theirs
  }
  const fields = (mine, theirs, keys) => Object.fromEntries(keys.map((k) => [k, text(mine[k], theirs[k])]))
  const host = (key) => ({ ...draft[key], ...fields(draft[key], base[key], ['name', 'shortName', 'father', 'mother']) })
  const hasNumber = (a) => a.number.trim()
  const next = {
    ...draft,
    groom: host('groom'),
    bride: host('bride'),
    datetime: text(draft.datetime, base.datetime),
    venue: {
      ...draft.venue,
      ...fields(draft.venue, base.venue, ['name', 'hall', 'address', 'tel', 'lat', 'lng', 'naverMapUrl']),
      transport: list(draft.venue.transport, base.venue.transport, (t) => t.lines.some((l) => l.trim())),
    },
    cover: { ...draft.cover, ...fields(draft.cover, base.cover, ['caption']) },
    greeting: {
      title: text(draft.greeting.title, base.greeting.title),
      message: list(draft.greeting.message, base.greeting.message, (l) => l.trim()),
    },
    accounts: {
      groom: list(draft.accounts.groom, base.accounts.groom, hasNumber),
      bride: list(draft.accounts.bride, base.accounts.bride, hasNumber),
    },
    share: { ...draft.share, ...fields(draft.share, base.share, ['image', 'siteUrl']) },
  }
  return { draft: filled ? next : draft, filled }
}

const FILLED_KEY = 'wedding-editor:filled'
// 같은 청첩장 내용으로는 한 번만 채우도록, 채운 내용의 지문을 기억해 둔다.
const fingerprint = (base) => {
  let h = 5381
  for (const ch of JSON.stringify(base)) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0
  return String(h)
}
export function alreadyFilledFrom(base) {
  try {
    return localStorage.getItem(FILLED_KEY) === fingerprint(base)
  } catch {
    return true
  }
}
export function markFilledFrom(base) {
  try {
    localStorage.setItem(FILLED_KEY, fingerprint(base))
  } catch {
    // 저장소를 쓸 수 없으면 기억하지 않는다.
  }
}

export function loadDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return saved?.draft ? saved : null
  } catch {
    return null
  }
}

export function saveDraft(draft) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ draft, savedAt: new Date().toISOString() }))
    return true
  } catch {
    return false
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 저장소를 쓸 수 없는 환경이면 지울 것도 없다.
  }
}

// ---------- 값 다듬기 ----------

// 부르는 이름을 비워두면 성을 뺀 이름을 쓴다 (김민준 → 민준).
export function shortNameOf(p) {
  if (p.shortName.trim()) return p.shortName.trim()
  const name = p.name.trim()
  return name.length >= 3 ? name.slice(-2) : name
}

export const isValidDatetime = (iso) => Boolean(iso) && !Number.isNaN(new Date(iso).getTime())
export const hasCoords = (venue) => Number.isFinite(venue.lat) && Number.isFinite(venue.lng)

// 공유 문구를 비워두면 입력한 정보로 만든다.
export function autoShareText(draft) {
  const [first, second] = orderedHosts(draft)
  const title = `${first.name || first.label} ♥ ${second.name || second.label} 결혼합니다`
  if (!isValidDatetime(draft.datetime)) return { title, description: draft.venue.name }
  const when = kstParts(new Date(draft.datetime))
  const place = [draft.venue.name, draft.venue.hall].filter(Boolean).join(' ')
  return { title, description: `${formatKoreanDate(when)} ${formatKoreanTime(when)}${place ? `, ${place}` : ''}` }
}

// 내보내기·미리보기 공통: 이름 빈칸 정리, 빈 교통편·계좌 줄 제거, 공유 문구 자동 채움.
export function finalize(draft) {
  const host = (p) => ({ ...p, name: p.name.trim(), shortName: shortNameOf(p) })
  const auto = autoShareText(draft)
  const { photos: _photos, bgmFile, ...rest } = draft
  return {
    ...rest,
    // 첨부한 음악은 ZIP 안에서 public/audio/bgm.<확장자> 로 들어간다
    bgm: draft.bgm === 'upload' ? (bgmFile ? `audio/bgm.${bgmFile.ext}` : '') : draft.bgm,
    groom: host(draft.groom),
    bride: host(draft.bride),
    venue: {
      ...draft.venue,
      transport: draft.venue.transport
        .map((t) => ({ title: t.title.trim(), lines: t.lines.map((l) => l.trim()).filter(Boolean) }))
        .filter((t) => t.title && t.lines.length),
    },
    accounts: {
      groom: draft.accounts.groom.filter((a) => a.number.trim()),
      bride: draft.accounts.bride.filter((a) => a.number.trim()),
    },
    share: {
      ...draft.share,
      title: draft.share.title.trim() || auto.title,
      description: draft.share.description.trim() || auto.description,
    },
  }
}

// 미리보기용 설정: 아직 비어 있는 필수 값은 자리표시 값으로 채워 화면이 깨지지 않게 한다.
// mediaUrls: 첨부한 사진·음악 id → 미리보기 주소. 첨부하지 않은 사진은 지금 청첩장 사진을 쓴다.
export function toPreviewConfig(draft, base, mediaUrls = {}) {
  const d = finalize(draft)
  // 새로 첨부한 사진은 미리보기 주소로, 이미 올라가 있는 사진은 그대로 보여준다.
  const gallery = draft.photos.gallery
    .map((entry) => (typeof entry === 'string' ? mediaUrls[entry] && { src: mediaUrls[entry], thumb: mediaUrls[entry] } : entry))
    .filter(Boolean)
  const { cover } = draft.photos
  const coverImage = typeof cover === 'string' ? mediaUrls[cover] : cover?.src
  const placeholder = (p, label) => ({ ...p, name: p.name || label, shortName: p.shortName || label })
  return {
    ...d,
    groom: placeholder(d.groom, '신랑'),
    bride: placeholder(d.bride, '신부'),
    datetime: isValidDatetime(d.datetime) ? d.datetime : base.datetime,
    venue: {
      ...d.venue,
      name: d.venue.name || '예식장 이름',
      ...(hasCoords(d.venue) ? {} : { lat: base.venue.lat, lng: base.venue.lng }),
    },
    cover: { ...d.cover, image: coverImage ?? base.cover.image },
    gallery,
    bgm: draft.bgm === 'upload' ? (mediaUrls[draft.bgmFile?.id] ?? '') : d.bgm,
  }
}

// ---------- 확인 목록 ----------

export function checklist(draft) {
  const { groom, bride, venue } = draft
  const parents = [groom.father, groom.mother, bride.father, bride.mother].every((n) => n.trim())
  return [
    { id: 'host', label: '신랑·신부 이름', required: true, ok: Boolean(groom.name.trim() && bride.name.trim()) },
    { id: 'ceremony', label: '예식 일시', required: true, ok: isValidDatetime(draft.datetime) },
    { id: 'ceremony', label: '예식장 이름·주소', required: true, ok: Boolean(venue.name.trim() && venue.address.trim()) },
    { id: 'ceremony', label: '지도 위치', required: false, ok: hasCoords(venue) },
    { id: 'family', label: '혼주(부모님) 성함', required: false, ok: parents },
    { id: 'photos', label: '표지 사진', required: false, ok: Boolean(draft.photos.cover) },
    { id: 'photos', label: '갤러리 사진', required: false, ok: draft.photos.gallery.length > 0 },
    { id: 'music', label: '배경음악', required: false, ok: draft.bgm === 'upload' ? Boolean(draft.bgmFile) : Boolean(draft.bgm) },
    {
      id: 'account',
      label: '계좌번호',
      required: false,
      ok: [...draft.accounts.groom, ...draft.accounts.bride].some((a) => a.number.trim()),
    },
  ]
}
