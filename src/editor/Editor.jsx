import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { audioType, canUploadAudio, openUpload, publishSiteConfig, uploadFile } from '../lib/api.js'
import { copyText } from '../lib/clipboard.js'
import { Toaster, toast } from '../components/Toast.jsx'
import {
  alreadyFilledFrom,
  blankDraft,
  checklist,
  clearDraft,
  draftFromConfig,
  fillBlanks,
  finalize,
  loadDraft,
  markFilledFrom,
  saveDraft,
  toPreviewConfig,
} from './draft.js'
import { toWeddingJs } from './exportConfig.js'
import { saveFile } from './saveFile.js'
import PreviewFrame from './Preview.jsx'
import { clearMedia, loadMedia, mediaBlob, removeMedia, resizeImage, useMediaUrls } from './media.js'
import { CloseIcon, Connector, PlusIcon } from './ui.jsx'
import {
  AccountSection,
  CeremonySection,
  DesignSection,
  FamilySection,
  GreetingSection,
  HostSection,
  MusicSection,
  PhotoSection,
  ShareSection,
  TransportSection,
} from './sections.jsx'

// 편집 화면을 열 때의 내용. 지금 청첩장 내용이 바뀐 뒤 처음 열면, 작성하던 내용의 빈칸을 그 값으로 채운다.
// 작성하던 내용이 없으면 지금 청첩장 내용으로 바로 시작한다. (같은 내용으로는 한 번만 한다)
// 개발 모드에서는 React가 초기화 함수를 두 번 부르므로, 한 번 계산한 결과를 다시 쓴다.
let initialCache = null
const initialDraft = (currentConfig, isLive) => (initialCache ??= computeInitialDraft(currentConfig, isLive))

// 작성 중인 글이 청첩장과 마지막으로 같았던 때의 모습을 기억해 둔다 (불러왔을 때·저장해서 적용했을 때).
// 그 뒤로 고친 것이 없으면, 다음에 열 때 지금 청첩장 내용으로 다시 맞춘다.
// 다른 기기에서 저장한 내용이 이 브라우저의 예전 내용으로 되돌아가는 일을 막기 위해서다.
const SYNC_KEY = 'wedding-editor:synced'
const textOf = (draft) => {
  const { bgmFile: _bgmFile, ...text } = draft
  return JSON.stringify(text)
}
const synced = {
  matches(draft) {
    try {
      return localStorage.getItem(SYNC_KEY) === textOf(draft)
    } catch {
      return false
    }
  },
  mark(draft) {
    try {
      localStorage.setItem(SYNC_KEY, textOf(draft))
    } catch {
      // 저장소를 쓸 수 없으면 기억하지 않는다.
    }
  },
}

// 글과 사진 목록을 지금 청첩장 내용으로 바꾼다. 첨부한 음악은 그대로 둔다.
function withCurrentText(draft, currentConfig) {
  const next = draftFromConfig(currentConfig)
  return { ...next, ...(draft.bgm === 'upload' ? { bgm: draft.bgm, bgmFile: draft.bgmFile } : {}) }
}

const isNewPhoto = (entry) => typeof entry === 'string'
const newPhotoIds = (draft) => [draft.photos.cover, ...draft.photos.gallery].filter(isNewPhoto)

// 갤러리가 비어 있는 작성 내용(예전에 만든 것)은 지금 청첩장의 갤러리로 채운다.
function withGallery(draft, base) {
  if (!draft || draft.photos.gallery.length || !base.photos.gallery.length) return draft
  return { ...draft, photos: { ...draft.photos, gallery: base.photos.gallery } }
}

// 올릴 사진 크기 (긴 변 기준). 빌드할 때 줄이는 크기와 비슷하게 맞춘다.
const PHOTO_SIZE = { cover: 1600, full: 1600, thumb: 480 }

// "저장"할 때 쓰는 관리 비밀번호(/admin 과 같은 것)를 이 탭에만 기억한다. 탭을 닫으면 지워진다.
const PASSWORD_KEY = 'wedding-admin:password'
const rememberedPassword = {
  get() {
    try {
      return sessionStorage.getItem(PASSWORD_KEY) ?? ''
    } catch {
      return ''
    }
  },
  set(value) {
    try {
      if (value) sessionStorage.setItem(PASSWORD_KEY, value)
      else sessionStorage.removeItem(PASSWORD_KEY)
    } catch {
      // 저장소를 쓸 수 없으면 저장할 때마다 다시 입력하면 된다.
    }
  },
}

// 청첩장에 바로 반영할 내용. 사진은 이미 서버에 올라가 있는 것({ src, thumb })만 담는다 — 새로 첨부한 사진은 먼저 올린다.
// 표지를 바꾸지 않았으면(cover 가 null) 지금 청첩장의 표지를 그대로 둔다.
// 첨부한 음악은 서버에 올린 주소(bgmFile.url)가 있을 때만 담고, 없으면 지금 청첩장의 음악을 그대로 둔다.
function toLiveConfig(draft) {
  const { bgm, ...rest } = finalize(draft)
  const { cover, gallery } = draft.photos
  const config = {
    ...rest,
    cover: { ...rest.cover, ...(cover && !isNewPhoto(cover) ? { image: cover.src } : {}) },
    gallery: gallery.filter((entry) => !isNewPhoto(entry)),
  }
  if (draft.bgm !== 'upload') return { ...config, bgm }
  return draft.bgmFile?.url ? { ...config, bgm: draft.bgmFile.url } : config
}

function computeInitialDraft(currentConfig, isLive) {
  const saved = loadDraft()
  const base = draftFromConfig(currentConfig)
  const fresh = !alreadyFilledFrom(base)
  if (fresh) markFilledFrom(base)
  if (!saved) {
    if (fresh) synced.mark(base)
    return { draft: fresh ? base : null, savedAt: null, notice: fresh ? '지금 청첩장 내용을 불러왔어요.' : '' }
  }
  const mine = withGallery(draftFromConfig(saved.draft), base)
  // 청첩장과 맞춘 뒤 고친 것이 없으면, 지금 청첩장 내용으로 다시 맞춘다.
  if (isLive && synced.matches(saved.draft)) {
    const draft = withCurrentText(mine, currentConfig)
    synced.mark(draft)
    return { draft, savedAt: saved.savedAt, notice: '지금 청첩장 내용을 불러왔어요.' }
  }
  const { draft, filled } = fresh ? fillBlanks(mine, base) : { draft: mine, filled: 0 }
  return {
    draft,
    savedAt: saved.savedAt,
    notice: filled ? '작성하던 내용을 불러오고, 빈칸은 지금 청첩장 내용으로 채웠어요.' : '작성하던 내용을 불러왔어요.',
  }
}

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
  { id: 'music', label: '음악', Component: MusicSection },
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
    case 'music':
      return checks.find((c) => c.id === 'music').ok
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

function Finish({ draft, checks, onReset, onLoadCurrent }) {
  const missing = checks.filter((c) => c.required && !c.ok)
  const photoCount = (draft.photos.cover ? 1 : 0) + draft.photos.gallery.length // 내려받는 파일에 담길 사진 수
  const hasMusic = draft.bgm === 'upload' && Boolean(draft.bgmFile)
  // 첨부 파일 설명: '사진 3장 + 음악'
  const filesLabel = [photoCount && `사진 ${photoCount}장`, hasMusic && '음악'].filter(Boolean).join(' + ')
  const [packing, setPacking] = useState(false)

  // 사진이 있으면 wedding.js 와 사진을 ZIP 하나로, 없으면 wedding.js 만 내려받는다.
  const download = async () => {
    if (missing.length && !window.confirm(`${missing.map((c) => c.label).join(', ')}이(가) 비어 있어요. 그래도 내보낼까요?`)) return
    if (!filesLabel) {
      saveFile(new Blob([toWeddingJs(draft)], { type: 'text/javascript;charset=utf-8' }), 'wedding.js')
      toast('wedding.js 파일을 내려받았어요.')
      return
    }
    setPacking(true)
    try {
      const { buildPackage, packageName } = await import('./package.js')
      saveFile(await buildPackage(draft), packageName())
      toast(`입력 내용과 ${filesLabel}을 압축 파일로 내려받았어요.`)
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
    else toast(filesLabel ? `입력 내용을 복사했어요. ${filesLabel}은 복사되지 않으니 내려받기를 이용해주세요.` : '내용을 복사했어요. 메신저에 붙여넣어 전달해도 돼요.')
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
        <p className="ed-section__desc">
          글·계좌·디자인·사진·음악 모두 위의 ‘저장’을 누르면 청첩장에 바로 반영돼요. 아래 내려받기는 지금 내용을 파일로
          보관하거나 개발자에게 전달할 때 써요.
        </p>
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
          {packing ? '압축 파일 만드는 중…' : filesLabel ? `내려받기 (입력 내용 + ${filesLabel}, .zip)` : 'wedding.js 내려받기'}
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

      <div className="ed-finish__links">
        <button type="button" className="ed-link" onClick={onLoadCurrent}>
          지금 청첩장 내용 불러오기
        </button>
        <button type="button" className="ed-link ed-link--danger" onClick={onReset}>
          처음부터 다시 하기
        </button>
      </div>
    </section>
  )
}

// ---------- 편집 화면 ----------

// ---------- 저장할 때 비밀번호 묻기 ----------

function PasswordDialog({ error, busy, onSubmit, onClose }) {
  const [password, setPassword] = useState('')
  return (
    <div className="ed-modal" role="dialog" aria-modal="true" aria-label="관리 비밀번호 입력">
      <form
        className="ed-modal__card"
        onSubmit={(e) => {
          e.preventDefault()
          if (password) onSubmit(password)
        }}
      >
        <h2 className="ed-modal__title">청첩장에 적용하기</h2>
        <p className="ed-modal__desc">
          관리 비밀번호(참석 의사 확인 화면과 같은 비밀번호)를 입력하면 지금 내용이 청첩장에 바로 반영돼요.
        </p>
        <input
          className="ed-input"
          type="password"
          value={password}
          autoFocus
          autoComplete="current-password"
          aria-label="관리 비밀번호"
          placeholder="관리 비밀번호"
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p className="ed-modal__error" role="alert">
            {error}
          </p>
        )}
        <div className="ed-modal__actions">
          <button type="button" className="ed-btn" onClick={onClose} disabled={busy}>
            취소
          </button>
          <button type="submit" className="ed-btn ed-btn--primary" disabled={busy || !password}>
            {busy ? '적용하는 중…' : '적용하기'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function Editor({ current: currentConfig, currentIsLive = false }) {
  const [initial] = useState(() => initialDraft(currentConfig, currentIsLive))
  const [draft, setDraft] = useState(initial.draft)
  const [savedAt, setSavedAt] = useState(initial.savedAt)
  const [saveFailed, setSaveFailed] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [asking, setAsking] = useState(false) // 비밀번호 입력창
  const [askError, setAskError] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [appliedAt, setAppliedAt] = useState(null)
  const [progress, setProgress] = useState('') // 저장 중 진행 상황 (사진 올리는 중 2/5)
  const wide = useMediaQuery('(min-width: 1024px)')

  useEffect(() => {
    if (initial.notice) toast(initial.notice)
  }, [initial])

  const draftRef = useRef(draft)
  draftRef.current = draft
  const dirtyRef = useRef(false) // 아직 저장하지 않은 변경이 있는지
  const publishingRef = useRef(false)

  // 지금 내용을 이 브라우저에 저장한다.
  const persist = useCallback(() => {
    if (!draftRef.current) return false
    const ok = saveDraft(draftRef.current)
    setSaveFailed(!ok)
    if (ok) {
      dirtyRef.current = false
      setSavedAt(new Date().toISOString())
    }
    return ok
  }, [])

  // 지금 내용을 청첩장에 반영한다. 비밀번호가 틀리면 다시 묻는다.
  const publish = useCallback(async (password) => {
    let d = draftRef.current
    if (!d || publishingRef.current) return
    publishingRef.current = true
    setPublishing(true)
    let musicSkipped = false
    let photosSkipped = 0
    try {
      // 새로 첨부한 사진·음악이 있으면 먼저 서버에 올리고, 올린 주소를 작성 내용에 적어 둔다 (다시 저장할 때 또 올리지 않게).
      const music = d.bgm === 'upload' && d.bgmFile && !d.bgmFile.url ? d.bgmFile : null
      const photoIds = newPhotoIds(d)
      if (music || photoIds.length) {
        const ticket = await openUpload(password)
        await loadMedia([...photoIds, music?.id].filter(Boolean))

        const uploaded = {} // 사진 id → { src, thumb }
        for (const [n, id] of photoIds.entries()) {
          setProgress(`사진 올리는 중 ${n + 1}/${photoIds.length}`)
          const blob = mediaBlob(id)
          if (!blob) continue // 보관해 둔 파일이 사라진 사진은 건너뛴다
          const isCover = d.photos.cover === id
          const full = await resizeImage(blob, isCover ? PHOTO_SIZE.cover : PHOTO_SIZE.full)
          const src = await uploadFile({ ticket, name: `${id}.jpg`, blob: full, contentType: 'image/jpeg' })
          const thumb = isCover
            ? src
            : await uploadFile({
                ticket,
                name: `${id}-thumb.jpg`,
                blob: await resizeImage(blob, PHOTO_SIZE.thumb, 0.8),
                contentType: 'image/jpeg',
              })
          uploaded[id] = { src, thumb }
        }
        photosSkipped = photoIds.length - Object.keys(uploaded).length

        let musicUrl = null
        if (music) {
          setProgress('음악 올리는 중')
          const blob = mediaBlob(music.id)
          if (blob && canUploadAudio(music.ext)) {
            musicUrl = await uploadFile({ ticket, name: `bgm-${music.id}.${music.ext}`, blob, contentType: audioType(music.ext) })
          } else {
            musicSkipped = true
          }
        }

        // 올린 사진은 id 대신 주소로 바꿔 적는다. 올리지 못한 사진은 그대로 남겨 다음 저장 때 다시 시도한다.
        const swap = (entry) => (isNewPhoto(entry) && uploaded[entry] ? uploaded[entry] : entry)
        const applyUploads = (cur) => ({
          ...cur,
          photos: { cover: cur.photos.cover && swap(cur.photos.cover), gallery: cur.photos.gallery.map(swap) },
          ...(musicUrl && cur.bgmFile?.id === music.id ? { bgmFile: { ...cur.bgmFile, url: musicUrl } } : {}),
        })
        d = applyUploads(d)
        setDraft((cur) => (cur ? applyUploads(cur) : cur))
        Object.keys(uploaded).forEach(removeMedia)
      }
      setProgress('')
      await publishSiteConfig({ password, config: toLiveConfig(d) })
      rememberedPassword.set(password)
      synced.mark(d)
      setAsking(false)
      setAskError('')
      setAppliedAt(new Date().toISOString())
      toast(
        musicSkipped
          ? '저장하고 청첩장에 적용했어요. 다만 첨부한 음악은 올리지 못했어요. mp3나 m4a 파일로 다시 첨부해주세요.'
          : photosSkipped
            ? `저장하고 청첩장에 적용했어요. 다만 사진 ${photosSkipped}장은 올리지 못했어요. 그 사진을 다시 첨부해주세요.`
            : '저장하고 청첩장에 바로 적용했어요.',
      )
    } catch (err) {
      console.error(err)
      if (/비밀번호/.test(err.message)) {
        rememberedPassword.set('')
        setAskError('비밀번호가 올바르지 않아요.')
        setAsking(true)
      } else {
        toast('이 브라우저에는 저장했지만 청첩장에는 적용하지 못했어요. 잠시 후 다시 저장해주세요.')
      }
    } finally {
      publishingRef.current = false
      setPublishing(false)
      setProgress('')
    }
  }, [])

  // 저장 버튼·Ctrl+S: 이 브라우저에 저장하고, 청첩장에도 바로 반영한다.
  const saveNow = useCallback(() => {
    const d = draftRef.current
    if (!d) return
    if (!persist()) toast('이 브라우저에는 저장하지 못했어요. 시크릿 모드이거나 저장 공간이 막혀 있는지 확인해주세요.')
    const missing = checklist(d).filter((c) => c.required && !c.ok)
    if (missing.length) {
      toast(`저장했어요. ${missing.map((c) => c.label).join(', ')}이(가) 비어 있어 청첩장에는 아직 적용하지 않았어요.`)
      return
    }
    const password = rememberedPassword.get()
    if (password) publish(password)
    else {
      setAskError('')
      setAsking(true)
    }
  }, [persist, publish])

  // 입력이 멈추면 이 브라우저에 자동 저장한다.
  useEffect(() => {
    if (!draft) return
    dirtyRef.current = true
    const timer = setTimeout(persist, 400)
    return () => clearTimeout(timer)
  }, [draft, persist])

  // 자동 저장을 기다리는 사이에 창을 닫거나 다른 앱으로 넘어가도 내용이 남게 한다.
  useEffect(() => {
    const flush = () => dirtyRef.current && persist()
    const onHide = () => document.visibilityState === 'hidden' && flush()
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 's') return
      e.preventDefault()
      if (draftRef.current) saveNow()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('keydown', onKey)
    }
  }, [persist, saveNow])

  useEffect(() => {
    if (!previewOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [previewOpen])

  const set = useCallback((path, value) => setDraft((d) => setIn(d, path, value)), [])
  const photoUrls = useMediaUrls(draft ? [...newPhotoIds(draft), draft.bgmFile?.id].filter(Boolean) : [])
  // 사진 주소 객체는 매번 새로 만들어지므로, 내용(photoKey)이 바뀔 때만 미리보기를 다시 계산한다.
  const photoKey = JSON.stringify(photoUrls)
  const previewConfig = useMemo(() => draft && toPreviewConfig(draft, currentConfig, photoUrls), [draft, photoKey])
  const checks = useMemo(() => draft && checklist(draft), [draft])

  const start = (next) => {
    clearMedia() // 예전에 첨부하고 남은 사진 정리
    setDraft(next)
    window.scrollTo(0, 0)
  }
  // 작성 중인 글과 사진 목록을 지금 청첩장 내용으로 바꾼다. 첨부한 음악은 그대로 둔다.
  const loadCurrent = () => {
    if (!window.confirm('작성 중인 내용을 지금 청첩장 내용으로 바꿀까요? 새로 첨부하고 아직 저장하지 않은 사진은 빠져요.')) return
    if (draftRef.current) newPhotoIds(draftRef.current).forEach(removeMedia)
    setDraft((d) => {
      const next = withCurrentText(d, currentConfig)
      synced.mark(next)
      return next
    })
    window.scrollTo(0, 0)
    toast('지금 청첩장 내용을 불러왔어요.')
  }
  const reset = () => {
    if (!window.confirm('입력한 내용을 모두 지우고 처음으로 돌아갈까요?')) return
    clearDraft()
    clearMedia()
    dirtyRef.current = false
    draftRef.current = null // 지운 직후 창을 닫아도 다시 저장되지 않게 한다
    setDraft(null)
    setSavedAt(null)
    window.scrollTo(0, 0)
  }

  if (!draft) {
    return (
      <>
        <Intro onBlank={() => start(blankDraft(currentConfig))} onCurrent={() => {
            const next = draftFromConfig(currentConfig)
            synced.mark(next)
            start(next)
          }}
        />
        <Toaster />
      </>
    )
  }

  const required = checks.filter((c) => c.required)
  const clock = (iso) => new Date(iso).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
  const savedLabel = saveFailed
    ? '이 브라우저에서는 자동 저장이 안 돼요'
    : [savedAt && `임시 저장 ·${clock(savedAt)}`, appliedAt && `청첩장 적용 ·${clock(appliedAt)}`].filter(Boolean).join(' / ')

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
          <div className="ed-header__actions">
            <span className="ed-progress">
              필수 {required.filter((c) => c.ok).length}/{required.length}
            </span>
            <button
              type="button"
              className="ed-btn ed-btn--sm ed-btn--primary"
              title="저장하고 청첩장에 적용 (Ctrl+S)"
              onClick={saveNow}
              disabled={publishing}
            >
              {publishing ? progress || '적용 중…' : '저장'}
            </button>
          </div>
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
              <Component draft={draft} set={set} done={sectionDone(id, draft, checks)} urls={photoUrls} current={currentConfig} />
              <Connector />
            </Fragment>
          ))}
          <Finish draft={draft} checks={checks} onReset={reset} onLoadCurrent={loadCurrent} />
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

      {asking && <PasswordDialog error={askError} busy={publishing} onSubmit={publish} onClose={() => setAsking(false)} />}

      <Toaster />
    </div>
  )
}
