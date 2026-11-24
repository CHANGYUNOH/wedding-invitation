// RSVP·방명록은 Supabase에 저장한다. 설정 방법은 README의 "Supabase 설정" 참고.
// 필요한 요청이 몇 개뿐이라 SDK 없이 Supabase REST API를 직접 부른다.
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '')
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const TIMEOUT_MS = 20_000
const configured = Boolean(SUPABASE_URL && SUPABASE_KEY)

// 개발 중(npm run dev)에 설정이 없으면 브라우저 localStorage에 저장한다.
// 배포 빌드에서 설정이 빠졌다면 하객의 글이 각자 휴대폰에만 남지 않도록 오류로 드러낸다.
export const isLocalMode = !configured && import.meta.env.DEV

if (isLocalMode) {
  console.info('[wedding] Supabase 설정(VITE_SUPABASE_URL·VITE_SUPABASE_ANON_KEY)이 없어 RSVP·방명록을 localStorage에 저장합니다.')
}

// path 예: 'guestbook?select=…' (조회), 'rsvp' (추가), 'rpc/add_guestbook' (함수 호출)
async function request(path, { body, headers } = {}) {
  if (!configured) throw new Error('VITE_SUPABASE_URL·VITE_SUPABASE_ANON_KEY 가 설정되지 않았습니다.')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        ...(body && { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
    const text = await res.text()
    const data = text ? JSON.parse(text) : null
    if (!res.ok) throw new Error(data?.message || `요청에 실패했습니다. (${res.status})`)
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
    // 하객은 rsvp를 읽을 수 없으므로 저장한 줄을 돌려받지 않는다.
    await request('rsvp', { body: row, headers: { Prefer: 'return=minimal' } })
    return
  }
  local.write('rsvp', [...local.read('rsvp'), { ...row, id: Date.now(), created_at: new Date().toISOString() }])
}

// 최신순으로 limit개를 가져오고, 다음 페이지가 있는지 함께 알려준다.
export async function fetchGuestbook({ offset, limit }) {
  if (!isLocalMode) {
    // 한 개 더 가져와서 다음 페이지가 있는지 확인한다.
    const query = new URLSearchParams({
      select: 'id,name,message,created_at',
      order: 'created_at.desc,id.desc',
      offset,
      limit: limit + 1,
    })
    const rows = await request(`guestbook?${query}`)
    return { items: rows.slice(0, limit), hasMore: rows.length > limit }
  }
  const rows = local
    .read('guestbook')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(({ password: _password, ...rest }) => rest)
  return { items: rows.slice(offset, offset + limit), hasMore: rows.length > offset + limit }
}

export async function addGuestbook({ name, message, password }) {
  if (!isLocalMode) {
    await request('rpc/add_guestbook', {
      body: { p_name: name.trim(), p_message: message.trim(), p_password: password },
    })
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
    const deleted = await request('rpc/delete_guestbook', { body: { p_id: id, p_password: password } })
    return deleted === true
  }
  const rows = local.read('guestbook')
  const target = rows.find((r) => r.id === id)
  if (!target || target.password !== password) return false
  local.write('guestbook', rows.filter((r) => r.id !== id))
  return true
}

// 관리 화면(/admin): 비밀번호가 맞으면 참석 의사 전체를 최신순으로 돌려준다. 틀리면 오류를 던진다.
export async function fetchRsvpList(password) {
  if (!isLocalMode) return request('rpc/list_rsvp', { body: { p_password: password } })
  return local.read('rsvp').sort((a, b) => b.created_at.localeCompare(a.created_at))
}

// 관리 화면: 방명록 전체를 최신순으로 가져온다. (방명록은 누구나 읽을 수 있어 비밀번호가 필요 없다)
export async function fetchGuestbookAll() {
  if (!isLocalMode) return request('guestbook?select=id,name,message,created_at&order=created_at.desc,id.desc')
  return local
    .read('guestbook')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(({ password: _password, ...rest }) => rest)
}

// 관리 화면: 관리 비밀번호로 방명록 글을 지운다. 지웠으면 true, 이미 없는 글이면 false.
export async function adminDeleteGuestbook({ id, password }) {
  if (!isLocalMode) {
    const deleted = await request('rpc/admin_delete_guestbook', { body: { p_password: password, p_id: id } })
    return deleted === true
  }
  const rows = local.read('guestbook')
  local.write('guestbook', rows.filter((r) => r.id !== id))
  return rows.some((r) => r.id === id)
}

// 관리 화면: 관리 비밀번호로 참석 의사 한 건을 지운다. 지웠으면 true, 이미 없으면 false.
export async function adminDeleteRsvp({ id, password }) {
  if (!isLocalMode) {
    const deleted = await request('rpc/admin_delete_rsvp', { body: { p_password: password, p_id: id } })
    return deleted === true
  }
  const rows = local.read('rsvp')
  local.write('rsvp', rows.filter((r) => r.id !== id))
  return rows.some((r) => r.id === id)
}

// 편집 화면에서 저장해 둔 청첩장 내용. 없으면 null. (청첩장에 그대로 보이는 내용이라 누구나 읽을 수 있다)
export async function fetchSiteConfig() {
  if (!isLocalMode) return (await request('site_config?select=config,updated_at&id=eq.1'))[0] ?? null
  return local.read('site_config')[0] ?? null
}

// 편집 화면: 관리 비밀번호로 청첩장 내용을 저장한다. 비밀번호가 틀리면 오류를 던진다.
export async function publishSiteConfig({ password, config }) {
  if (!isLocalMode) {
    await request('rpc/publish_site_config', { body: { p_password: password, p_config: config } })
    return
  }
  local.write('site_config', [{ config, updated_at: new Date().toISOString() }])
}

// 편집 화면: 관리 비밀번호가 맞으면 서버가 10분짜리 업로드 허가(ticket)를 내준다. 틀리면 오류를 던진다.
export async function openUpload(password) {
  if (isLocalMode) return 'local'
  return request('rpc/open_upload', { body: { p_password: password } })
}

// 허가 번호와 같은 이름의 폴더에 사진을 올리고, 청첩장에서 쓸 공개 주소를 돌려준다.
export async function uploadFile({ ticket, name, blob, contentType }) {
  if (isLocalMode) return URL.createObjectURL(blob)
  const path = `${ticket}/${name}`
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/wedding-media/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': contentType,
      // 파일마다 주소가 달라 내용이 바뀌지 않으므로 오래 보관해도 된다.
      'cache-control': 'max-age=31536000',
    },
    body: blob,
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.message || `파일을 올리지 못했습니다. (${res.status})`)
  }
  return `${SUPABASE_URL}/storage/v1/object/public/wedding-media/${path}`
}
