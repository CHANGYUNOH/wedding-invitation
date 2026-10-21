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
    bgm: base.bgm,
    share: { title: '', description: '', image: base.share.image, siteUrl: base.share.siteUrl },
  }
}

// 지금 청첩장 설정을 편집용으로 옮긴다. 예전 설정에 없던 항목은 빈 양식 값으로 채운다.
export function draftFromConfig(config) {
  const blank = blankDraft(config)
  const { gallery: _gallery, cover, ...rest } = structuredClone(config)
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
    accounts: {
      groom: rest.accounts.groom.map((a) => ({ kakaopay: '', ...a })),
      bride: rest.accounts.bride.map((a) => ({ kakaopay: '', ...a })),
    },
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

// 부르는 이름을 비워두면 성을 뺀 이름을 쓴다 (노찬규 → 찬규).
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
  return {
    ...draft,
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
export function toPreviewConfig(draft, base) {
  const d = finalize(draft)
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
    cover: { ...d.cover, image: base.cover.image },
    gallery: base.gallery,
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
    {
      id: 'account',
      label: '계좌번호',
      required: false,
      ok: [...draft.accounts.groom, ...draft.accounts.bride].some((a) => a.number.trim()),
    },
  ]
}
