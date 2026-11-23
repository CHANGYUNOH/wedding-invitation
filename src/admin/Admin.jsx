// 신랑·신부가 참석 의사를 확인하는 화면. 비밀번호가 맞아야 서버가 목록을 내려주며, 읽기 전용이다.
import { useEffect, useMemo, useState } from 'react'
import { fetchRsvpList } from '../lib/api.js'
import { Toaster, toast } from '../components/Toast.jsx'
import { saveFile } from '../editor/saveFile.js'

const SIDES = { groom: '신랑측', bride: '신부측' }
const MEALS = { yes: '식사함', no: '식사 안 함', undecided: '미정' }
const FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'groom', label: '신랑측' },
  { id: 'bride', label: '신부측' },
]

// 새로고침해도 다시 묻지 않도록 비밀번호를 이 탭에만 기억한다. 탭을 닫으면 지워진다.
const SESSION_KEY = 'wedding-admin:password'
const remembered = {
  get() {
    try {
      return sessionStorage.getItem(SESSION_KEY) ?? ''
    } catch {
      return ''
    }
  },
  set(value) {
    try {
      if (value) sessionStorage.setItem(SESSION_KEY, value)
      else sessionStorage.removeItem(SESSION_KEY)
    } catch {
      // 저장소를 쓸 수 없으면 새로고침할 때 다시 입력하면 된다.
    }
  },
}

const formatWhen = (iso) =>
  new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })

// 엑셀에서 수식으로 읽히지 않도록 =,+,-,@ 로 시작하는 값 앞에 작은따옴표를 붙이고, 쉼표·따옴표가 있으면 감싼다.
function csvCell(value) {
  let text = String(value ?? '')
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function toCsv(rows) {
  const lines = [
    ['구분', '성함', '참석 여부', '인원', '식사', '제출 시각'],
    ...rows.map((r) => [
      SIDES[r.side] ?? r.side,
      r.name,
      r.attending ? '참석' : '불참',
      r.attending ? r.headcount : 0,
      r.attending ? (MEALS[r.meal] ?? r.meal) : '',
      new Date(r.created_at).toLocaleString('ko-KR'),
    ]),
  ]
  // 엑셀이 한글을 깨뜨리지 않도록 BOM을 붙인다.
  return `﻿${lines.map((line) => line.map(csvCell).join(',')).join('\r\n')}`
}

function summarize(rows) {
  const coming = rows.filter((r) => r.attending)
  const sum = (list) => list.reduce((n, r) => n + r.headcount, 0)
  return {
    people: sum(coming),
    groom: sum(coming.filter((r) => r.side === 'groom')),
    bride: sum(coming.filter((r) => r.side === 'bride')),
    meal: sum(coming.filter((r) => r.meal === 'yes')),
    mealUndecided: sum(coming.filter((r) => r.meal === 'undecided')),
    declined: rows.length - coming.length,
  }
}

function Login({ onLogin, loading, error }) {
  const [password, setPassword] = useState('')
  return (
    <form
      className="ad-login"
      onSubmit={(e) => {
        e.preventDefault()
        if (password) onLogin(password)
      }}
    >
      <h1 className="ad-login__title">참석 의사 확인</h1>
      <p className="ad-login__desc">신랑·신부용 화면이에요. 비밀번호를 입력해주세요.</p>
      <input
        className="ed-input"
        type="password"
        value={password}
        autoComplete="current-password"
        aria-label="비밀번호"
        placeholder="비밀번호"
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && (
        <p className="ad-login__error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="ed-btn ed-btn--primary ed-btn--lg" disabled={loading || !password}>
        {loading ? '확인하는 중…' : '확인하기'}
      </button>
    </form>
  )
}

export default function Admin() {
  const [password, setPassword] = useState('')
  // 기억해 둔 비밀번호가 있으면 입력 화면 대신 불러오는 중 화면부터 보여준다.
  const [restoring, setRestoring] = useState(() => Boolean(remembered.get()))
  const [rows, setRows] = useState(null)
  const [loadedAt, setLoadedAt] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  const load = async (pw) => {
    setLoading(true)
    setError('')
    try {
      const list = await fetchRsvpList(pw)
      setRows(list ?? [])
      setPassword(pw)
      setLoadedAt(new Date())
      remembered.set(pw)
      return true
    } catch (err) {
      console.error(err)
      const wrong = /비밀번호/.test(err.message)
      // 비밀번호가 바뀌었으면 기억해 둔 값을 지워 다시 입력받는다.
      if (wrong) remembered.set('')
      setError(wrong ? '비밀번호가 올바르지 않아요.' : '목록을 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
      return false
    } finally {
      setLoading(false)
    }
  }

  // 새로고침한 경우: 기억해 둔 비밀번호로 바로 불러온다.
  useEffect(() => {
    const saved = remembered.get()
    if (!saved) return
    let stale = false
    load(saved).finally(() => !stale && setRestoring(false))
    return () => {
      stale = true
    }
    // 화면이 처음 열릴 때 한 번만 실행한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const logout = () => {
    remembered.set('')
    setPassword('')
    setRows(null)
    setError('')
  }

  const refresh = async () => {
    if (await load(password)) toast('새로 불러왔어요.')
    else toast('새로 불러오지 못했어요.')
  }

  const summary = useMemo(() => summarize(rows ?? []), [rows])
  const shown = useMemo(() => (rows ?? []).filter((r) => filter === 'all' || r.side === filter), [rows, filter])

  if (!rows && restoring) {
    return <p className="ad-loading">불러오는 중…</p>
  }

  if (!rows) {
    return (
      <>
        <Login onLogin={load} loading={loading} error={error} />
        <Toaster />
      </>
    )
  }

  const download = () => {
    const today = new Date().toLocaleDateString('sv-SE') // 2026-11-23 형태
    saveFile(new Blob([toCsv(shown)], { type: 'text/csv;charset=utf-8' }), `참석의사-${today}.csv`)
    toast('엑셀에서 열 수 있는 파일로 내려받았어요.')
  }

  return (
    <div className="ad">
      <header className="ad-head">
        <div>
          <h1 className="ad-head__title">참석 의사</h1>
          <p className="ad-head__sub">
            응답 {rows.length}건{loadedAt && ` · ${formatWhen(loadedAt)} 기준`}
          </p>
        </div>
        <div className="ad-head__actions">
          <button type="button" className="ed-btn ed-btn--sm" onClick={refresh} disabled={loading}>
            {loading ? '불러오는 중…' : '새로고침'}
          </button>
          <button type="button" className="ed-btn ed-btn--sm" onClick={logout}>
            나가기
          </button>
        </div>
      </header>

      <dl className="ad-stats">
        <div className="ad-stat ad-stat--main">
          <dt>참석 인원</dt>
          <dd>{summary.people}명</dd>
        </div>
        <div className="ad-stat">
          <dt>신랑측</dt>
          <dd>{summary.groom}명</dd>
        </div>
        <div className="ad-stat">
          <dt>신부측</dt>
          <dd>{summary.bride}명</dd>
        </div>
        <div className="ad-stat">
          <dt>식사 예정</dt>
          <dd>
            {summary.meal}명{summary.mealUndecided > 0 && <small> (+미정 {summary.mealUndecided})</small>}
          </dd>
        </div>
        <div className="ad-stat">
          <dt>불참</dt>
          <dd>{summary.declined}건</dd>
        </div>
      </dl>

      <div className="ad-tools">
        <div className="ad-filter" role="group" aria-label="구분">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`ad-filter__btn${filter === f.id ? ' is-on' : ''}`}
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button type="button" className="ed-btn ed-btn--sm" onClick={download} disabled={!shown.length}>
          엑셀 파일 내려받기
        </button>
      </div>

      {shown.length ? (
        <ul className="ad-list">
          {shown.map((r) => (
            <li key={r.id} className={`ad-row${r.attending ? '' : ' is-declined'}`}>
              <div className="ad-row__main">
                <strong>{r.name}</strong>
                <span className="ad-row__side">{SIDES[r.side] ?? r.side}</span>
              </div>
              <div className="ad-row__detail">
                {r.attending ? (
                  <>
                    <span className="ad-tag ad-tag--ok">참석 {r.headcount}명</span>
                    <span className="ad-tag">{MEALS[r.meal] ?? r.meal}</span>
                  </>
                ) : (
                  <span className="ad-tag ad-tag--no">불참</span>
                )}
                <time dateTime={r.created_at}>{formatWhen(r.created_at)}</time>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ad-empty">{rows.length ? '이 구분에는 아직 응답이 없어요.' : '아직 들어온 응답이 없어요.'}</p>
      )}

      <p className="ad-note">같은 분이 여러 번 제출하면 각각 따로 표시돼요. 이 화면에서는 내용을 고치거나 지울 수 없어요.</p>
      <Toaster />
    </div>
  )
}
