import { useWedding } from '../lib/wedding-context.jsx'
import { orderedHosts } from '../lib/hosts.js'
import { asset } from '../lib/asset.js'
import { themeOf } from '../themes/index.js'
import {
  kstParts,
  formatKoreanDate,
  formatKoreanTime,
  formatDotDate,
  WEEKDAYS_EN,
  WEEKDAYS_EN_FULL,
} from '../lib/date.js'
import './Cover.css'

const pad = (n) => String(n).padStart(2, '0')

const ScrollHint = () => (
  <div className="cover__scroll" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="22" height="22">
      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  </div>
)

// 로맨틱 플로럴 액자 모서리의 꽃가지
const FloralCorner = ({ className }) => (
  <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <path d="M8 112C26 84 44 62 70 42s34-26 42-30" />
      <path d="M44 66c-8-6-12-16-10-26" />
      <path d="M70 42c-2-10 2-20 10-26" />
    </g>
    <g fill="currentColor">
      <path d="M22 92c-6-8-6-16-2-20 6 4 8 12 2 20z" opacity="0.55" />
      <path d="M30 84c9-2 16 1 18 6-6 4-14 2-18-6z" opacity="0.55" />
      <path d="M52 58c-7-7-8-15-4-19 6 3 8 11 4 19z" opacity="0.55" />
      <path d="M60 52c9 0 15 4 16 9-7 3-14 0-16-9z" opacity="0.55" />
      <path d="M90 26c-1-9 3-16 8-17 2 7-2 14-8 17z" opacity="0.55" />
      <circle cx="34" cy="40" r="6" />
      <circle cx="27" cy="36" r="3" opacity="0.7" />
      <circle cx="40" cy="34" r="3" opacity="0.7" />
      <circle cx="80" cy="16" r="5" />
      <circle cx="74" cy="12" r="2.5" opacity="0.7" />
      <circle cx="112" cy="12" r="4" />
    </g>
  </svg>
)

function Names({ hosts, joiner }) {
  const [first, second] = hosts
  return (
    <h1 className="cover__names">
      {first.name}
      <span className="cover__and">{joiner}</span>
      {second.name}
    </h1>
  )
}

// 미니멀 화이트: 위에 날짜, 아치형 사진
function ArchCover({ wedding, hosts, when, photo, place }) {
  return (
    <header className="cover cover--arch">
      <div className="cover__date" aria-hidden="true">
        <span className="cover__year">{when.year}</span>
        <span className="cover__md">
          {pad(when.month)}
          <span className="cover__slash">/</span>
          {pad(when.day)}
        </span>
        <span className="cover__weekday">{WEEKDAYS_EN[when.weekday]}</span>
      </div>
      <figure className="cover__photo">{photo}</figure>
      <p className="cover__caption">{wedding.cover.caption}</p>
      <Names hosts={hosts} joiner="·" />
      <p className="cover__info">
        {formatKoreanDate(when)} {formatKoreanTime(when)}
        <br />
        {place}
      </p>
      <ScrollHint />
    </header>
  )
}

// 로맨틱 플로럴: 필기체 문구, 꽃 장식 액자
function FrameCover({ wedding, hosts, when, photo, place }) {
  return (
    <header className="cover cover--frame">
      <p className="cover__script">{wedding.cover.caption}</p>
      <figure className="cover__frame">
        {photo}
        <FloralCorner className="cover__corner cover__corner--tl" />
        <FloralCorner className="cover__corner cover__corner--br" />
      </figure>
      <Names hosts={hosts} joiner="&" />
      <p className="cover__info">
        {formatDotDate(when)} {WEEKDAYS_EN[when.weekday]}
        <br />
        {formatKoreanTime(when)} · {place}
      </p>
      <ScrollHint />
    </header>
  )
}

// 모던 나이트: 화면을 채운 사진 위에 글자
function FullCover({ wedding, hosts, when, photo, place }) {
  return (
    <header className="cover cover--full">
      <figure className="cover__bg">{photo}</figure>
      <div className="cover__content">
        <p className="cover__eyebrow">{wedding.cover.caption}</p>
        <Names hosts={hosts} joiner="&" />
        <span className="cover__rule" aria-hidden="true" />
        <p className="cover__info">
          {formatDotDate(when)} {WEEKDAYS_EN[when.weekday]} · {formatKoreanTime(when)}
          <br />
          {place}
        </p>
        <ScrollHint />
      </div>
    </header>
  )
}

// 볼드 타이포: 큰 날짜, 정사각 사진
function TypeCover({ wedding, hosts, when, photo, place }) {
  return (
    <header className="cover cover--type">
      <p className="cover__eyebrow">{wedding.cover.caption}</p>
      <p className="cover__bigdate" aria-label={formatKoreanDate(when)}>
        {pad(when.month)}
        <span>.</span>
        {pad(when.day)}
      </p>
      <p className="cover__sub">
        {when.year} · {WEEKDAYS_EN_FULL[when.weekday]}
      </p>
      <figure className="cover__square">{photo}</figure>
      <Names hosts={hosts} joiner="—" />
      <p className="cover__info">
        {formatKoreanDate(when)} {formatKoreanTime(when)}
        <br />
        {place}
      </p>
      <ScrollHint />
    </header>
  )
}

const LAYOUTS = { arch: ArchCover, frame: FrameCover, full: FullCover, type: TypeCover }

export default function Cover() {
  const wedding = useWedding()
  const hosts = orderedHosts(wedding)
  const when = kstParts(new Date(wedding.datetime))
  const Layout = LAYOUTS[themeOf(wedding.theme).cover] ?? ArchCover
  const photo = (
    <img src={asset(wedding.cover.image)} alt={`${hosts[0].name}, ${hosts[1].name} 웨딩 사진`} fetchPriority="high" />
  )
  const place = [wedding.venue.name, wedding.venue.hall].filter(Boolean).join(' ')

  return <Layout wedding={wedding} hosts={hosts} when={when} photo={photo} place={place} />
}
