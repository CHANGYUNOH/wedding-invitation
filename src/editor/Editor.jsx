import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { wedding as currentConfig } from '../config/wedding.js'
import { copyText } from '../lib/clipboard.js'
import { Toaster, toast } from '../components/Toast.jsx'
import { blankDraft, checklist, clearDraft, draftFromConfig, loadDraft, saveDraft, toPreviewConfig } from './draft.js'
import { toWeddingJs } from './exportConfig.js'
import PreviewFrame from './Preview.jsx'
import { clearPhotos, usePhotoUrls } from './photos.js'
import { CloseIcon, Connector, PlusIcon } from './ui.jsx'
import {
  AccountSection,
  CeremonySection,
  DesignSection,
  FamilySection,
  GreetingSection,
  HostSection,
  PhotoSection,
  ShareSection,
  TransportSection,
} from './sections.jsx'

// 'groom.name' 같은 경로의 값을 바꾼 새 객체를 돌려준다. value가 함수면 이전 값을 받아 계산한다.
function setIn(obj, path, value) {
  const [key, ...rest] = path.split('.')
  const next = rest.length ? setIn(obj[key], rest.join('.'), value) : typeof value === 'function' ? value(obj[key]) : value
  return Array.isArray(obj) ? Object.assign([...obj], { [key]: next }) : { ...obj, [key]: next }
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return matches
}

const SECTIONS = [
  { id: 'design', label: '디자인', Component: DesignSection },
  { id: 'host', label: '호스트', Component: HostSection, required: true },
  { id: 'family', label: '혼주', Component: FamilySection },
  { id: 'ceremony', label: '예식', Component: CeremonySection, required: true },
  { id: 'greeting', label: '인사말', Component: GreetingSection },
  { id: 'photos', label: '사진', Component: PhotoSection },
  { id: 'transport', label: '오시는 길', Component: TransportSection },
  { id: 'account', label: '계좌', Component: AccountSection },
  { id: 'share', label: '공유', Component: ShareSection },
]

function sectionDone(id, draft, checks) {
  const ok = (cid) => checks.filter((c) => c.id === cid && c.required !== false).every((c) => c.ok)
  switch (id) {
    case 'design':
      return true
    case 'host':
      return ok('host')
    case 'family':
      return checks.find((c) => c.id === 'family').ok
    case 'ceremony':
      return checks.filter((c) => c.id === 'ceremony' && c.required).every((c) => c.ok)
    case 'greeting':
      return Boolean(draft.greeting.title.trim() && draft.greeting.message.join('').trim())
    case 'photos':
      return Boolean(draft.photos.cover || draft.photos.gallery.length)
    case 'transport':
      return draft.venue.transport.some((t) => t.lines.some((l) => l.trim()))
    case 'account':
      return checks.find((c) => c.id === 'account').ok
    case 'share':
      // 비워둬도 이름이 있으면 자동 문구가 들어가므로 완료로 본다.
      return Boolean(draft.share.title.trim() || draft.share.description.trim() || ok('host'))
    default:
      return false
  }
}

// ---------- 처음 들어왔을 때 안내 ----------

function Intro({ onBlank, onCurrent }) {
  return (
    <div className="ed-intro">
      <div className="ed-intro__card">
        <h1 className="ed-intro__title">
          차근차근
          <br />
          시작해볼까요?
        </h1>
        <p className="ed-intro__desc">
          몇 가지 정보만 입력하면
          <br />
          모바일 청첩장이 완성돼요
        </p>
        <button type="button" className="ed-btn ed-btn--primary ed-btn--lg" onClick={onBlank}>
          <PlusIcon /> 정보 입력 시작하기
        </button>
        <button type="button" className="ed-link ed-link--strong" onClick={onCurrent}>
          지금 청첩장 내용으로 시작하기
        </button>
      </div>
      <ol className="ed-intro__steps" aria-label="진행 순서">
        {['디자인 선택', '호스트·혼주 정보', '예식 일시·장소', '인사말·계좌', '파일로 내보내기'].map((s, i) => (
          <li key={s}>
            <b>{i + 1}</b>
            {s}
          </li>
        ))}
      </ol>
      <p className="ed-intro__note">입력한 내용은 이 브라우저에 자동으로 저장돼요.</p>
    </div>
  )
}

// ---------- 마무리 ----------

function saveFile(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Finish({ draft, checks, onReset }) {
  const missing = checks.filter((c) => c.required && !c.ok)
  const photoCount = (draft.photos.cover ? 1 : 0) + draft.photos.gallery.length
  const [packing, setPacking] = useState(false)

  // 사진이 있으면 wedding.js 와 사진을 ZIP 하나로, 없으면 wedding.js 만 내려받는다.
  const download = async () => {
    if (missing.length && !window.confirm(`${missing.map((c) => c.label).join(', ')}이(가) 비어 있어요. 그래도 내보낼까요?`)) return
    if (!photoCount) {
      saveFile(new Blob([toWeddingJs(draft)], { type: 'text/javascript;charset=utf-8' }), 'wedding.js')
      toast('wedding.js 파일을 내려받았어요.')
      return
    }
    setPacking(true)
    try {
      const { buildPackage, packageName } = await import('./package.js')
      saveFile(await buildPackage(draft), packageName())
      toast(`입력 내용과 사진 ${photoCount}장을 압축 파일로 내려받았어요.`)
    } catch (err) {
      console.error(err)
      toast('압축 파일을 만들지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setPacking(false)
    }
  }

  const copy = async () => {
    const ok = await copyText(toWeddingJs(draft))
    if (!ok) toast('복사하지 못했어요. 파일 내려받기를 이용해주세요.')
    else toast(photoCount ? '입력 내용을 복사했어요. 사진은 복사되지 않으니 내려받기를 이용해주세요.' : '내용을 복사했어요. 메신저에 붙여넣어 전달해도 돼요.')
  }

  return (
    <section className="ed-section ed-finish" id="sec-finish">
      <header className="ed-section__head">
        <h2 className="ed-section__title">
          <span className="ed-section__emoji" aria-hidden="true">
            🎉
          </span>
          입력을 마쳤다면
        </h2>
        <p className="ed-section__desc">파일로 내보내 개발자에게 전달하면 청첩장에 반영돼요.</p>
      </header>

      <ul className="ed-checklist">
        {checks.map((c) => (
          <li key={c.label} className={c.ok ? 'is-ok' : c.required ? 'is-missing' : 'is-optional'}>
            <span aria-hidden="true">{c.ok ? '✓' : c.required ? '!' : '–'}</span>
            {c.label}
            {!c.ok && <small>{c.required ? '필수' : '선택'}</small>}
          </li>
        ))}
      </ul>

      <div className="ed-finish__actions">
        <button type="button" className="ed-btn ed-btn--primary ed-btn--lg" onClick={download} disabled={packing}>
          {packing ? '압축 파일 만드는 중…' : photoCount ? `내려받기 (입력 내용 + 사진 ${photoCount}장, .zip)` : 'wedding.js 내려받기'}
        </button>
        <button type="button" className="ed-btn ed-btn--lg" onClick={copy}>
          입력 내용 복사하기
        </button>
      </div>
      <p className="ed-field__hint">
        카카오톡 안에서 열었다면 내려받기가 안 될 수 있어요. 오른쪽 위 메뉴의 ‘다른 브라우저로 열기’를 눌러주세요.
      </p>

      <details className="ed-dev">
        <summary>개발자에게 전달된 파일은 이렇게 반영해요</summary>
        <ol>
          <li>
            압축 파일은 프로젝트 폴더에 그대로 풉니다. <code>src/config/wedding.js</code>가 바뀌고 사진은 <code>photos/</code>에
            들어가요. (wedding.js만 받았다면 그 파일만 바꿉니다)
          </li>
          <li>
            <code>npm run build</code>로 확인합니다. 사진은 이때 자동으로 줄어 <code>public/images</code>에 들어가요.
          </li>
          <li>바뀐 파일을 커밋·push 하면 배포돼요.</li>
        </ol>
      </details>

      <button type="button" className="ed-link ed-link--danger" onClick={onReset}>
        처음부터 다시 하기
      </button>
    </section>
  )
}

// ---------- 편집 화면 ----------

export default function Editor() {
  const [saved] = useState(loadDraft)
  const [draft, setDraft] = useState(() => (saved ? draftFromConfig(saved.draft) : null))
  const [savedAt, setSavedAt] = useState(saved?.savedAt ?? null)
  const [saveFailed, setSaveFailed] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const wide = useMediaQuery('(min-width: 1024px)')

  useEffect(() => {
    if (saved) toast('작성하던 내용을 불러왔어요.')
  }, [saved])

  // 입력이 멈추면 이 브라우저에 자동 저장한다.
  useEffect(() => {
    if (!draft) return
    const timer = setTimeout(() => {
      const ok = saveDraft(draft)
      setSaveFailed(!ok)
      if (ok) setSavedAt(new Date().toISOString())
    }, 400)
    return () => clearTimeout(timer)
  }, [draft])

  useEffect(() => {
    if (!previewOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [previewOpen])

  const set = useCallback((path, value) => setDraft((d) => setIn(d, path, value)), [])
  const photoUrls = usePhotoUrls(draft ? [draft.photos.cover, ...draft.photos.gallery].filter(Boolean) : [])
  // 사진 주소 객체는 매번 새로 만들어지므로, 내용(photoKey)이 바뀔 때만 미리보기를 다시 계산한다.
  const photoKey = JSON.stringify(photoUrls)
  const previewConfig = useMemo(() => draft && toPreviewConfig(draft, currentConfig, photoUrls), [draft, photoKey])
  const checks = useMemo(() => draft && checklist(draft), [draft])

  const start = (next) => {
    clearPhotos() // 예전에 첨부하고 남은 사진 정리
    setDraft(next)
    window.scrollTo(0, 0)
  }
  const reset = () => {
    if (!window.confirm('입력한 내용을 모두 지우고 처음으로 돌아갈까요?')) return
    clearDraft()
    clearPhotos()
    setDraft(null)
    setSavedAt(null)
    window.scrollTo(0, 0)
  }

  if (!draft) {
    return (
      <>
        <Intro onBlank={() => start(blankDraft(currentConfig))} onCurrent={() => start(draftFromConfig(currentConfig))} />
        <Toaster />
      </>
    )
  }

  const required = checks.filter((c) => c.required)
  const savedLabel = saveFailed
    ? '이 브라우저에서는 자동 저장이 안 돼요'
    : savedAt
      ? `자동 저장됨 · ${new Date(savedAt).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })}`
      : ''

  return (
    <div className="ed">
      <header className="ed-header">
        <div className="ed-header__bar">
          <div>
            <h1 className="ed-header__title">청첩장 정보 입력</h1>
            <p className={`ed-header__save${saveFailed ? ' is-error' : ''}`} aria-live="polite">
              {savedLabel}
            </p>
          </div>
          <span className="ed-progress">
            필수 {required.filter((c) => c.ok).length}/{required.length}
          </span>
        </div>
        <nav className="ed-nav" aria-label="입력 단계">
          {SECTIONS.map(({ id, label, required: req }) => {
            const done = sectionDone(id, draft, checks)
            return (
              <a key={id} href={`#sec-${id}`} className={`ed-nav__chip${done ? ' is-done' : ''}`}>
                {done ? '✓ ' : req ? '• ' : ''}
                {label}
              </a>
            )
          })}
          <a href="#sec-finish" className="ed-nav__chip ed-nav__chip--finish">
            내보내기
          </a>
        </nav>
      </header>

      <div className="ed-layout">
        <main className="ed-form">
          {SECTIONS.map(({ id, Component }) => (
            <Fragment key={id}>
              <Component draft={draft} set={set} done={sectionDone(id, draft, checks)} urls={photoUrls} />
              <Connector />
            </Fragment>
          ))}
          <Finish draft={draft} checks={checks} onReset={reset} />
        </main>

        {wide && (
          <aside className="ed-preview" aria-label="미리보기">
            <div className="ed-phone">
              <PreviewFrame config={previewConfig} className="ed-phone__screen" />
            </div>
            <p className="ed-preview__note">입력하면 바로 반영돼요. 방명록·참석 의사·공유는 미리보기에서 전송되지 않아요.</p>
          </aside>
        )}
      </div>

      {!wide && (
        <div className="ed-bottombar">
          <button type="button" className="ed-btn ed-btn--lg" onClick={() => setPreviewOpen(true)}>
            미리보기
          </button>
          <a href="#sec-finish" className="ed-btn ed-btn--primary ed-btn--lg">
            완료하기
          </a>
        </div>
      )}

      {!wide && previewOpen && (
        <div className="ed-sheet" role="dialog" aria-modal="true" aria-label="미리보기">
          <div className="ed-sheet__bar">
            <strong>미리보기</strong>
            <button type="button" className="ed-icon-btn" aria-label="미리보기 닫기" onClick={() => setPreviewOpen(false)}>
              <CloseIcon />
            </button>
          </div>
          <PreviewFrame config={previewConfig} className="ed-sheet__screen" />
        </div>
      )}

      <Toaster />
    </div>
  )
}
