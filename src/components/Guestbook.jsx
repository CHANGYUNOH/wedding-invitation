import { useCallback, useEffect, useState } from 'react'
import { fetchGuestbook, addGuestbook, deleteGuestbook } from '../lib/api.js'
import { kstParts, formatDotDate } from '../lib/date.js'
import { usePreview } from '../lib/wedding-context.jsx'
import Section from './Section.jsx'
import Reveal from './Reveal.jsx'
import Modal from './Modal.jsx'
import { toast } from './Toast.jsx'
import './Guestbook.css'

const PAGE_SIZE = 5
const MAX_MESSAGE = 300

// 편집 페이지 미리보기에서 보여줄 예시 글
const SAMPLE_ENTRIES = [
  {
    id: 'sample-1',
    name: '하객',
    message: '결혼 진심으로 축하드려요!\n행복하게 잘 사세요 :)',
    created_at: new Date().toISOString(),
  },
  { id: 'sample-2', name: '친구', message: '두 사람의 앞날을 응원합니다.', created_at: new Date().toISOString() },
]

function WriteForm({ onDone }) {
  const [form, setForm] = useState({ name: '', password: '', message: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('이름을 입력해주세요.')
    if (form.password.length < 4) return setError('비밀번호는 4자 이상 입력해주세요.')
    if (!form.message.trim()) return setError('축하 메시지를 입력해주세요.')
    setSubmitting(true)
    setError('')
    try {
      await addGuestbook(form)
      toast('축하 메시지가 등록되었습니다.')
      onDone()
    } catch (err) {
      console.error(err)
      setError('등록에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <label className="field">
        <span className="field__label">이름</span>
        <input className="input" value={form.name} maxLength={20} autoComplete="name" onChange={set('name')} />
      </label>
      <label className="field">
        <span className="field__label">비밀번호 (삭제할 때 필요해요)</span>
        <input
          className="input"
          type="password"
          value={form.password}
          maxLength={20}
          autoComplete="new-password"
          onChange={set('password')}
        />
      </label>
      <label className="field">
        <span className="field__label">축하 메시지</span>
        <textarea
          className="input"
          value={form.message}
          maxLength={MAX_MESSAGE}
          placeholder="두 사람에게 축하의 마음을 전해주세요"
          onChange={set('message')}
        />
        <span className="guestbook__counter">
          {form.message.length} / {MAX_MESSAGE}
        </span>
      </label>
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
        {submitting ? '등록 중…' : '등록하기'}
      </button>
    </form>
  )
}

function DeleteForm({ entry, onDone }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!password) return setError('비밀번호를 입력해주세요.')
    setSubmitting(true)
    setError('')
    try {
      const ok = await deleteGuestbook({ id: entry.id, password })
      if (!ok) {
        setError('비밀번호가 일치하지 않습니다.')
        return
      }
      toast('삭제되었습니다.')
      onDone(entry.id)
    } catch (err) {
      console.error(err)
      setError('삭제에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <p className="guestbook__delete-target">
        <strong>{entry.name}</strong> 님의 메시지를 삭제할까요?
      </p>
      <label className="field">
        <span className="field__label">작성할 때 입력한 비밀번호</span>
        <input
          className="input"
          type="password"
          value={password}
          maxLength={20}
          autoComplete="off"
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
        {submitting ? '삭제 중…' : '삭제하기'}
      </button>
    </form>
  )
}

export default function Guestbook() {
  const preview = usePreview()
  const [items, setItems] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [writing, setWriting] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(async (offset) => {
    setStatus('loading')
    try {
      const page = await fetchGuestbook({ offset, limit: PAGE_SIZE })
      setItems((prev) => (offset === 0 ? page.items : [...prev, ...page.items]))
      setHasMore(page.hasMore)
      setStatus('ready')
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (preview) {
      setItems(SAMPLE_ENTRIES)
      setStatus('ready')
      return
    }
    load(0)
  }, [load, preview])

  const previewOnly = (action) => () => (preview ? toast('미리보기에서는 작성·삭제할 수 없어요.') : action())

  return (
    <Section id="guestbook" eyebrow="Guestbook" title="방명록">
      <Reveal>
        <p className="section__desc">
          두 사람의 새로운 시작을
          <br />
          따뜻한 메시지로 축하해주세요.
        </p>
      </Reveal>

      <Reveal>
        {items.length > 0 && (
          <ul className="guestbook__list">
            {items.map((entry) => (
              <li key={entry.id} className="guestbook__item">
                <div className="guestbook__meta">
                  <strong>{entry.name}</strong>
                  <time dateTime={entry.created_at}>{formatDotDate(kstParts(new Date(entry.created_at)))}</time>
                  <button
                    type="button"
                    className="guestbook__delete"
                    aria-label={`${entry.name}님의 메시지 삭제`}
                    onClick={previewOnly(() => setDeleting(entry))}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                      <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <p className="guestbook__message">{entry.message}</p>
              </li>
            ))}
          </ul>
        )}

        {status === 'ready' && items.length === 0 && (
          <p className="guestbook__empty">첫 번째 축하 메시지를 남겨주세요.</p>
        )}
        {status === 'error' && <p className="guestbook__empty">방명록을 불러오지 못했습니다.</p>}

        <div className="guestbook__actions">
          {hasMore && (
            <button type="button" className="btn" disabled={status === 'loading'} onClick={() => load(items.length)}>
              더보기
            </button>
          )}
          <button type="button" className="btn btn--primary" onClick={previewOnly(() => setWriting(true))}>
            축하 메시지 남기기
          </button>
        </div>
      </Reveal>

      <Modal open={writing} onClose={() => setWriting(false)} title="축하 메시지 남기기">
        <WriteForm
          onDone={() => {
            setWriting(false)
            load(0)
          }}
        />
      </Modal>

      <Modal open={deleting !== null} onClose={() => setDeleting(null)} title="메시지 삭제">
        {deleting && (
          <DeleteForm
            entry={deleting}
            onDone={(id) => {
              setDeleting(null)
              setItems((prev) => prev.filter((e) => e.id !== id))
            }}
          />
        )}
      </Modal>
    </Section>
  )
}
