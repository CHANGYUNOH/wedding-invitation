const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Supabase 키가 없으면 브라우저 localStorage에 저장한다 (로컬 개발·미리보기용).
export const isLocalMode = !(url && anonKey)

// 첫 화면 로딩을 가볍게 하려고 Supabase 클라이언트는 필요할 때 따로 불러온다.
let clientPromise = null
function getSupabase() {
  if (isLocalMode) return null
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url, anonKey, { auth: { persistSession: false } }),
  )
  return clientPromise
}

if (isLocalMode) {
  console.info('[wedding] Supabase 설정이 없어 RSVP·방명록을 localStorage에 저장합니다.')
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
  const supabase = await getSupabase()
  const row = { side, name: name.trim(), attending, headcount, meal }
  if (supabase) {
    const { error } = await supabase.from('rsvp').insert(row)
    if (error) throw error
    return
  }
  local.write('rsvp', [...local.read('rsvp'), { ...row, id: Date.now(), created_at: new Date().toISOString() }])
}

// 최신순으로 limit개를 가져오고, 다음 페이지가 있는지 함께 알려준다.
export async function fetchGuestbook({ offset, limit }) {
  const supabase = await getSupabase()
  if (supabase) {
    const { data, error } = await supabase
      .from('guestbook')
      .select('id, name, message, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit)
    if (error) throw error
    return { items: data.slice(0, limit), hasMore: data.length > limit }
  }
  const rows = local
    .read('guestbook')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(({ password: _password, ...rest }) => rest)
  return { items: rows.slice(offset, offset + limit), hasMore: rows.length > offset + limit }
}

export async function addGuestbook({ name, message, password }) {
  const supabase = await getSupabase()
  if (supabase) {
    const { error } = await supabase.rpc('add_guestbook', {
      p_name: name.trim(),
      p_message: message.trim(),
      p_password: password,
    })
    if (error) throw error
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
  const supabase = await getSupabase()
  if (supabase) {
    const { data, error } = await supabase.rpc('delete_guestbook', { p_id: id, p_password: password })
    if (error) throw error
    return data === true
  }
  const rows = local.read('guestbook')
  const target = rows.find((r) => r.id === id)
  if (!target || target.password !== password) return false
  local.write('guestbook', rows.filter((r) => r.id !== id))
  return true
}
