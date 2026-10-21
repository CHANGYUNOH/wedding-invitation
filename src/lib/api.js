// RSVP·방명록은 구글 시트(Apps Script 웹 앱)에 저장한다. 설정 방법은 README의 "구글 시트 설정" 참고.
const API_URL = import.meta.env.VITE_SHEETS_API_URL
const TIMEOUT_MS = 20_000

// 개발 중(npm run dev)에 주소가 없으면 브라우저 localStorage에 저장한다.
// 배포 빌드에서 주소가 빠졌다면 하객의 글이 각자 휴대폰에만 남지 않도록 오류로 드러낸다.
export const isLocalMode = !API_URL && import.meta.env.DEV

if (isLocalMode) {
  console.info('[wedding] 구글 시트 주소(VITE_SHEETS_API_URL)가 없어 RSVP·방명록을 localStorage에 저장합니다.')
}

// GET은 query로, POST는 body로 보낸다. Content-Type을 지정하지 않으면 text/plain으로 보내져
// CORS 사전 요청(preflight) 없이 Apps Script에 닿는다.
async function request({ query, body }) {
  if (!API_URL) throw new Error('VITE_SHEETS_API_URL 이 설정되지 않았습니다.')
  const url = new URL(API_URL)
  Object.entries(query ?? {}).forEach(([k, v]) => url.searchParams.set(k, v))
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: body ? 'POST' : 'GET',
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
    const data = await res.json()
    if (!data.ok) throw new Error(data.error || '요청에 실패했습니다.')
    return data
  } finally {
    clearTimeout(timer)
  }
}

const local = {
  read(key) {
    try {
      return JSON.parse(localStorage.getItem(`wedding:${key}`)) ?? []
    } catch {
      return []
    }
  },
  write(key, rows) {
    try {
      localStorage.setItem(`wedding:${key}`, JSON.stringify(rows))
    } catch {
      // 사생활 보호 모드 등에서 저장이 막혀도 화면은 계속 동작하게 둔다.
    }
  },
}

export async function submitRsvp({ side, name, attending, headcount, meal }) {
  const row = { side, name: name.trim(), attending, headcount, meal }
  if (!isLocalMode) {
    await request({ body: { action: 'rsvp', ...row } })
    return
  }
  local.write('rsvp', [...local.read('rsvp'), { ...row, id: Date.now(), created_at: new Date().toISOString() }])
}

// 최신순으로 limit개를 가져오고, 다음 페이지가 있는지 함께 알려준다.
export async function fetchGuestbook({ offset, limit }) {
  if (!isLocalMode) {
    const { items, hasMore } = await request({ query: { action: 'guestbook', offset, limit } })
    return { items, hasMore }
  }
  const rows = local
    .read('guestbook')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(({ password: _password, ...rest }) => rest)
  return { items: rows.slice(offset, offset + limit), hasMore: rows.length > offset + limit }
}

export async function addGuestbook({ name, message, password }) {
  if (!isLocalMode) {
    await request({ body: { action: 'addGuestbook', name: name.trim(), message: message.trim(), password } })
    return
  }
  const row = {
    id: Date.now(),
    name: name.trim(),
    message: message.trim(),
    password,
    created_at: new Date().toISOString(),
  }
  local.write('guestbook', [...local.read('guestbook'), row])
}

// 비밀번호가 맞으면 true, 틀리면 false
export async function deleteGuestbook({ id, password }) {
  if (!isLocalMode) {
    const { deleted } = await request({ body: { action: 'deleteGuestbook', id, password } })
    return deleted === true
  }
  const rows = local.read('guestbook')
  const target = rows.find((r) => r.id === id)
  if (!target || target.password !== password) return false
  local.write('guestbook', rows.filter((r) => r.id !== id))
  return true
}
