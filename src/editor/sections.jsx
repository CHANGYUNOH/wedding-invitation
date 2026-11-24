import { useEffect, useRef, useState } from 'react'
import { orderedHosts, parentName } from '../lib/hosts.js'
import { kstParts, formatKoreanDate, formatKoreanTime } from '../lib/date.js'
import { hasKakaoKey, getKakaoMaps } from '../lib/kakao.js'
import { asset } from '../lib/asset.js'
import { THEMES } from '../themes/index.js'
import { BGM_PRESETS, formatDuration } from '../music/presets.js'
import { ensureThemeFonts } from '../lib/theme-fonts.js'
import { addAudio, addPhotos, removeMedia, MAX_AUDIO_SIZE_MB } from './media.js'
import { toast } from '../components/Toast.jsx'
import { useSortable } from './useSortable.js'
import { GREETING_TEMPLATES, autoShareText, hasCoords, isValidDatetime, shortNameOf, siteGallery } from './draft.js'
import { wedding as currentConfig } from '../config/wedding.js'
import QrDownload, { normalizeUrl } from './QrDownload.jsx'
import { Check, CloseIcon, Datalist, Field, IconButton, PlusIcon, Row, Section, TextArea, TextInput } from './ui.jsx'

const RELATIONS = ['아들', '장남', '차남', '삼남', '막내아들', '외아들', '딸', '장녀', '차녀', '삼녀', '막내딸', '외동딸']
const BANKS = [
  '국민은행', '신한은행', '우리은행', '하나은행', '농협', '기업은행', '카카오뱅크', '토스뱅크', '케이뱅크',
  'SC제일은행', '씨티은행', '부산은행', 'iM뱅크(대구)', '경남은행', '광주은행', '전북은행', '제주은행',
  '새마을금고', '신협', '우체국', '수협', '산업은행',
]
const TRANSPORT_TITLES = ['지하철', '버스', '자가용', '주차', '셔틀버스', '기차', '고속버스']

// ---------- 디자인 ----------

export function DesignSection({ draft, set, done }) {
  // 카드 안 미리보기 글자를 각 템플릿 글꼴로 보여준다.
  useEffect(() => THEMES.forEach(ensureThemeFonts), [])
  const [first, second] = orderedHosts(draft)
  const when = isValidDatetime(draft.datetime) ? kstParts(new Date(draft.datetime)) : null
  const pad = (n) => String(n).padStart(2, '0')
  const date = when ? `${pad(when.month)}/${pad(when.day)}` : '04/17'

  return (
    <Section id="design" emoji="🎨" title="디자인 선택" desc="마음에 드는 디자인을 골라주세요. 언제든 바꿀 수 있고 미리보기에 바로 반영돼요." done={done}>
      <div className="ed-themes" role="radiogroup" aria-label="디자인 템플릿">
        {THEMES.map((t) => {
          const active = draft.theme === t.id
          const vars = {
            '--t-bg': t.swatch.bg,
            '--t-soft': t.swatch.soft,
            '--t-text': t.swatch.text,
            '--t-accent': t.swatch.accent,
            '--t-display': t.typeface.display,
            '--t-font': t.typeface.text,
          }
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={`ed-theme${active ? ' is-active' : ''}`}
              style={vars}
              onClick={() => set('theme', t.id)}
            >
              <span className={`ed-theme__thumb ed-theme__thumb--${t.cover}`} aria-hidden="true">
                <span className="ed-theme__date">{t.cover === 'type' ? date.replace('/', '.') : date}</span>
                <span className="ed-theme__photo" />
                <span className="ed-theme__names">
                  {first.name || first.label} {t.cover === 'arch' ? '·' : '&'} {second.name || second.label}
                </span>
              </span>
              <span className="ed-theme__name">{t.name}</span>
              <span className="ed-theme__desc">{t.desc}</span>
            </button>
          )
        })}
      </div>
    </Section>
  )
}

// ---------- 호스트 ----------

export function HostSection({ draft, set, done }) {
  const hosts = orderedHosts(draft)
  const swap = () => set('hostOrder', draft.hostOrder === 'bride-first' ? 'groom-first' : 'bride-first')

  return (
    <Section id="host" emoji="💍" title="호스트 정보 입력" desc="미리 잘 입력해두면 청첩장 편집이 편리해져요." done={done}>
      <Row>
        <Field label="신랑 이름">
          <TextInput label="신랑 이름" value={draft.groom.name} onChange={(v) => set('groom.name', v)} placeholder="이름 입력" />
        </Field>
        <Field label="신부 이름">
          <TextInput label="신부 이름" value={draft.bride.name} onChange={(v) => set('bride.name', v)} placeholder="이름 입력" />
        </Field>
      </Row>
      <Row>
        <Field label="신랑 부르는 이름" className="ed-field--compact">
          <TextInput
            label="신랑 부르는 이름"
            value={draft.groom.shortName}
            onChange={(v) => set('groom.shortName', v)}
            placeholder={shortNameOf({ ...draft.groom, shortName: '' }) || '예: 민준'}
          />
        </Field>
        <Field label="신부 부르는 이름" className="ed-field--compact">
          <TextInput
            label="신부 부르는 이름"
            value={draft.bride.shortName}
            onChange={(v) => set('bride.shortName', v)}
            placeholder={shortNameOf({ ...draft.bride, shortName: '' }) || '예: 서연'}
          />
        </Field>
      </Row>
      <p className="ed-field__hint ed-hint-under-row">인사말·카운트다운에 쓰여요. 비워두면 성을 뺀 이름을 써요.</p>

      <Field label="호스트 표기 순서" hint="눌러서 순서를 바꿀 수 있어요. 표지·인사말·계좌 순서가 함께 바뀌어요.">
        <div className="ed-order">
          {hosts.map((h) => (
            <button key={h.side} type="button" className="ed-order__chip" onClick={swap}>
              <span className="ed-order__grip" aria-hidden="true">◂▸</span>
              {h.label}
              {h.name && <small>{h.name}</small>}
            </button>
          ))}
        </div>
      </Field>
    </Section>
  )
}

// ---------- 혼주 ----------

export function FamilySection({ draft, set, done }) {
  return (
    <Section id="family" emoji="👪" title="혼주 정보 입력" desc="인사말 아래에 부모님 성함이 들어가요." done={done} optional>
      <Datalist id="ed-relations" options={RELATIONS} />
      {orderedHosts(draft).map((h) => {
        const p = draft[h.side]
        return (
          <div key={h.side} className="ed-subgroup">
            <h3 className="ed-subgroup__title">{h.label}측 혼주</h3>
            <Row>
              <Field label="아버지 성함">
                <TextInput label={`${h.label} 아버지 성함`} value={p.father} onChange={(v) => set(`${h.side}.father`, v)} placeholder="성함" />
                <Check checked={p.fatherDeceased} onChange={(v) => set(`${h.side}.fatherDeceased`, v)}>
                  고인 (故 표시)
                </Check>
              </Field>
              <Field label="어머니 성함">
                <TextInput label={`${h.label} 어머니 성함`} value={p.mother} onChange={(v) => set(`${h.side}.mother`, v)} placeholder="성함" />
                <Check checked={p.motherDeceased} onChange={(v) => set(`${h.side}.motherDeceased`, v)}>
                  고인 (故 표시)
                </Check>
              </Field>
            </Row>
            <Field label="관계">
              <TextInput
                label={`${h.label} 관계`}
                value={p.relation}
                onChange={(v) => set(`${h.side}.relation`, v)}
                list="ed-relations"
                placeholder={h.side === 'groom' ? '아들, 장남, 차남…' : '딸, 장녀, 차녀…'}
              />
            </Field>
            {(p.father || p.mother) && (
              <p className="ed-sample">
                {[p.father && parentName(p.father, p.fatherDeceased), p.mother && parentName(p.mother, p.motherDeceased)]
                  .filter(Boolean)
                  .join(' · ')}
                <span> 의 {p.relation} </span>
                <strong>{shortNameOf(p) || h.label}</strong>
              </p>
            )}
          </div>
        )
      })}
    </Section>
  )
}

// ---------- 예식 ----------

function VenueSearch({ onPick }) {
  const [query, setQuery] = useState('')
  const [state, setState] = useState({ status: 'idle', results: [] }) // idle | loading | done | error | unavailable

  const search = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    if (!hasKakaoKey) {
      setState({ status: 'unavailable', results: [] })
      return
    }
    setState({ status: 'loading', results: [] })
    try {
      const maps = await getKakaoMaps({ services: true })
      new maps.services.Places().keywordSearch(
        query.trim(),
        (data, status) => {
          if (status === maps.services.Status.OK) setState({ status: 'done', results: data })
          else if (status === maps.services.Status.ZERO_RESULT) setState({ status: 'done', results: [] })
          else setState({ status: 'error', results: [] })
        },
        { size: 8 },
      )
    } catch {
      setState({ status: 'unavailable', results: [] })
    }
  }

  const pick = (place) => {
    onPick({
      name: place.place_name,
      address: place.road_address_name || place.address_name,
      tel: place.phone,
      lat: Number(place.y),
      lng: Number(place.x),
    })
    setQuery(place.place_name)
    setState({ status: 'idle', results: [] })
  }

  return (
    <div className="ed-search">
      <form className="ed-search__bar" onSubmit={search} role="search">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          className="ed-search__input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예식장 이름이나 주소를 검색해주세요."
          aria-label="예식장 검색"
          enterKeyHint="search"
        />
        <button type="submit" className="ed-search__btn" disabled={state.status === 'loading'}>
          {state.status === 'loading' ? '검색 중' : '검색'}
        </button>
      </form>

      {state.status === 'done' && !state.results.length && <p className="ed-search__msg">검색 결과가 없어요. 아래에 직접 입력해도 돼요.</p>}
      {state.status === 'error' && <p className="ed-search__msg">검색하지 못했어요. 잠시 후 다시 시도하거나 아래에 직접 입력해주세요.</p>}
      {state.status === 'unavailable' && (
        <p className="ed-search__msg">
          지금은 예식장 검색을 쓸 수 없어요. (카카오 디벨로퍼스에서 <b>카카오맵 사용 설정</b>을 켜면 검색할 수 있어요.)
          <br />
          아래에 직접 입력해주세요.
        </p>
      )}
      {state.results.length > 0 && (
        <ul className="ed-search__results">
          {state.results.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => pick(p)}>
                <strong>{p.place_name}</strong>
                <span>{p.road_address_name || p.address_name}</span>
                <small>{[p.category_name?.split(' > ').pop(), p.phone].filter(Boolean).join(' · ')}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ISO(+09:00) ↔ 날짜·시간 입력값
const splitDatetime = (iso) => {
  if (!isValidDatetime(iso)) return { date: '', time: '' }
  const p = kstParts(new Date(iso))
  const pad = (n) => String(n).padStart(2, '0')
  return { date: `${p.year}-${pad(p.month)}-${pad(p.day)}`, time: `${pad(p.hour)}:${pad(p.minute)}` }
}
const joinDatetime = (date, time) => (date ? `${date}T${time || '12:00'}:00+09:00` : '')

export function CeremonySection({ draft, set, done }) {
  const { venue } = draft
  const { date, time } = splitDatetime(draft.datetime)
  const [manualCoords, setManualCoords] = useState(false)
  const when = isValidDatetime(draft.datetime) ? kstParts(new Date(draft.datetime)) : null

  const pickVenue = (place) => set('venue', (v) => ({ ...v, ...place, naverMapUrl: '' }))
  const setCoord = (key) => (value) => set(`venue.${key}`, value === '' ? null : Number(value))

  return (
    <Section id="ceremony" emoji="🗓️" title="예식 정보 입력" desc="아직 정해지지 않았다면 나중에 입력해도 됩니다." done={done}>
      <Field label="예식장">
        <VenueSearch onPick={pickVenue} />
      </Field>
      <Row>
        <Field label="예식장 이름">
          <TextInput label="예식장 이름" value={venue.name} onChange={(v) => set('venue.name', v)} placeholder="예: 더세인트" />
        </Field>
        <Field label="홀 이름">
          <TextInput label="홀 이름" value={venue.hall} onChange={(v) => set('venue.hall', v)} placeholder="예: 6층 그랜드볼룸" />
        </Field>
      </Row>
      <Field label="주소">
        <TextInput label="주소" value={venue.address} onChange={(v) => set('venue.address', v)} placeholder="도로명 주소" />
      </Field>
      <Field label="전화번호">
        <TextInput label="전화번호" value={venue.tel} onChange={(v) => set('venue.tel', v)} placeholder="02-000-0000" inputMode="tel" />
      </Field>
      <div className={`ed-coords${hasCoords(venue) ? ' is-set' : ''}`}>
        <span>
          {hasCoords(venue)
            ? `📍 지도 위치가 설정됐어요 (${venue.lat.toFixed(5)}, ${venue.lng.toFixed(5)})`
            : '📍 지도 위치가 아직 없어요. 예식장을 검색해서 고르면 자동으로 들어가요.'}
        </span>
        <button type="button" className="ed-link" onClick={() => setManualCoords((v) => !v)}>
          {manualCoords ? '닫기' : '직접 입력'}
        </button>
      </div>
      {manualCoords && (
        <>
          <Row>
            <Field label="위도">
              <TextInput label="위도" value={venue.lat ?? ''} onChange={setCoord('lat')} placeholder="37.5088" inputMode="decimal" />
            </Field>
            <Field label="경도">
              <TextInput label="경도" value={venue.lng ?? ''} onChange={setCoord('lng')} placeholder="126.8899" inputMode="decimal" />
            </Field>
          </Row>
          <p className="ed-field__hint ed-hint-under-row">카카오맵에서 장소를 우클릭 → "여기 좌표 보기"로 확인할 수 있어요.</p>
        </>
      )}

      <Field label="예식 일시">
        <Row>
          <input
            className="ed-input"
            type="date"
            aria-label="예식 날짜"
            value={date}
            onChange={(e) => set('datetime', joinDatetime(e.target.value, time))}
          />
          <input
            className="ed-input"
            type="time"
            step="600"
            aria-label="예식 시간"
            value={time}
            onChange={(e) => set('datetime', joinDatetime(date, e.target.value))}
          />
        </Row>
      </Field>
      {when && (
        <p className="ed-sample">
          {formatKoreanDate(when)} {formatKoreanTime(when)}
        </p>
      )}
    </Section>
  )
}

// ---------- 인사말 ----------

export function GreetingSection({ draft, set, done }) {
  const { greeting } = draft
  const useTemplate = (lines) => {
    const current = greeting.message.join('\n').trim()
    const isTemplate = GREETING_TEMPLATES.some((t) => t.join('\n') === current)
    if (current && !isTemplate && !window.confirm('지금 쓴 인사말을 예시 문구로 바꿀까요?')) return
    set('greeting.message', lines)
  }

  return (
    <Section id="greeting" emoji="💌" title="인사말" desc="예시 문구로 시작해서 고쳐 써도 좋아요." done={done}>
      <Field label="제목">
        <TextInput label="인사말 제목" value={greeting.title} onChange={(v) => set('greeting.title', v)} placeholder="초대합니다" />
      </Field>
      <Field label="예시 문구">
        <div className="ed-chips">
          {GREETING_TEMPLATES.map((lines, i) => (
            <button key={i} type="button" className="ed-chip" onClick={() => useTemplate(lines)}>
              {lines[0]}…
            </button>
          ))}
        </div>
      </Field>
      <Field label="본문" hint="빈 줄은 문단 사이 간격이 돼요.">
        <TextArea
          label="인사말 본문"
          rows={9}
          value={greeting.message.join('\n')}
          onChange={(v) => set('greeting.message', v.split('\n'))}
        />
      </Field>
      <Field label="표지 영문 문구" hint="표지 사진 아래에 작게 들어가요.">
        <TextInput label="표지 영문 문구" value={draft.cover.caption} onChange={(v) => set('cover.caption', v)} placeholder="WE ARE GETTING MARRIED" />
      </Field>
    </Section>
  )
}

// ---------- 오시는 길 ----------

export function TransportSection({ draft, set, done }) {
  const items = draft.venue.transport
  const update = (fn) => set('venue.transport', fn)

  return (
    <Section id="transport" emoji="🚇" title="오시는 길 안내" desc="지하철·버스·주차 안내를 적어주세요." done={done} optional>
      <Datalist id="ed-transport" options={TRANSPORT_TITLES} />
      {items.map((item, i) => (
        <div key={i} className="ed-card">
          <div className="ed-card__head">
            <TextInput
              label="교통편 이름"
              value={item.title}
              onChange={(v) => update((list) => list.map((t, j) => (j === i ? { ...t, title: v } : t)))}
              list="ed-transport"
              placeholder="예: 지하철"
            />
            <IconButton label="이 교통편 삭제" onClick={() => update((list) => list.filter((_, j) => j !== i))}>
              <CloseIcon />
            </IconButton>
          </div>
          <TextArea
            label={`${item.title || '교통편'} 안내`}
            rows={3}
            value={item.lines.join('\n')}
            onChange={(v) => update((list) => list.map((t, j) => (j === i ? { ...t, lines: v.split('\n') } : t)))}
            placeholder={'한 줄에 하나씩 적어주세요.\n예: 2호선 신도림역 1번 출구 도보 1분'}
          />
        </div>
      ))}
      <button type="button" className="ed-add" onClick={() => update((list) => [...list, { title: '', lines: [] }])}>
        <PlusIcon /> 교통편 추가
      </button>
      <p className="ed-field__hint">내용을 비워둔 교통편은 청첩장에 나오지 않아요.</p>
    </Section>
  )
}

// ---------- 계좌 ----------

export function AccountSection({ draft, set, done }) {
  return (
    <Section id="account" emoji="💳" title="마음 전하실 곳" desc="축의금 계좌를 신랑측·신부측으로 나눠 적어주세요." done={done} optional>
      <Datalist id="ed-banks" options={BANKS} />
      {orderedHosts(draft).map(({ side, label }) => {
        const rows = draft.accounts[side]
        const update = (fn) => set(`accounts.${side}`, fn)
        const change = (i, key) => (v) => update((list) => list.map((a, j) => (j === i ? { ...a, [key]: v } : a)))
        return (
          <div key={side} className="ed-subgroup">
            <h3 className="ed-subgroup__title">{label}측 계좌</h3>
            {rows.map((a, i) => (
              <div key={i} className="ed-card">
                <div className="ed-card__head">
                  <div className="ed-account-who">
                    <TextInput label="관계" value={a.role} onChange={change(i, 'role')} placeholder="관계" className="ed-input ed-input--role" />
                    <TextInput label="예금주" value={a.name} onChange={change(i, 'name')} placeholder="예금주" />
                  </div>
                  <IconButton label="이 계좌 삭제" onClick={() => update((list) => list.filter((_, j) => j !== i))}>
                    <CloseIcon />
                  </IconButton>
                </div>
                <div className="ed-row ed-row--account">
                  <TextInput label="은행" value={a.bank} onChange={change(i, 'bank')} list="ed-banks" placeholder="은행" />
                  <TextInput label="계좌번호" value={a.number} onChange={change(i, 'number')} placeholder="계좌번호" inputMode="numeric" />
                </div>
                <TextInput
                  label="카카오페이 송금 링크"
                  value={a.kakaopay}
                  onChange={change(i, 'kakaopay')}
                  placeholder="카카오페이 송금 링크 (선택)"
                  inputMode="url"
                />
              </div>
            ))}
            <button
              type="button"
              className="ed-add"
              onClick={() => update((list) => [...list, { role: '', name: '', bank: '', number: '', kakaopay: '' }])}
            >
              <PlusIcon /> {label}측 계좌 추가
            </button>
          </div>
        )
      })}
      <p className="ed-field__hint">계좌번호를 비워둔 줄은 청첩장에 나오지 않아요.</p>
    </Section>
  )
}

// ---------- 공유 ----------

export function ShareSection({ draft, set, done, urls }) {
  const [busy, setBusy] = useState(false)
  // 공유 카드 사진: 새로 고른 사진(id) → 이미 올라간 사진({ src }) → 지금 청첩장의 공유 사진 순으로 보여준다.
  const picked = draft.photos.share
  const shareImage = typeof picked === 'string' ? urls[picked] : picked ? asset(picked.src) : asset(draft.share.image)
  const pickImage = async (fileList) => {
    const file = [...fileList].find((f) => f.type.startsWith('image/'))
    if (!file) return
    setBusy(true)
    const { ids, failed } = await addPhotos([file])
    setBusy(false)
    if (!ids[0]) {
      if (failed.length) toast('열 수 없는 사진이에요. 아이폰 HEIC 사진은 JPG로 바꿔서 넣어주세요.')
      return
    }
    if (typeof picked === 'string') removeMedia(picked)
    set('photos.share', ids[0])
  }
  const resetImage = () => {
    if (typeof picked === 'string') removeMedia(picked)
    set('photos.share', null)
  }
  const auto = autoShareText(draft)
  const title = draft.share.title.trim() || auto.title
  const description = draft.share.description.trim() || auto.description
  // 예전에 저장해 둔 입력 내용에는 옛 주소가 남아 있을 수 있어, 지금 배포 주소와 다르면 알려준다.
  const deployedUrl = currentConfig.share.siteUrl
  const urlDiffers = normalizeUrl(draft.share.siteUrl) !== normalizeUrl(deployedUrl)

  return (
    <Section id="share" emoji="🔗" title="공유 설정" desc="카카오톡으로 보낼 때 보이는 문구예요. 비워두면 입력한 정보로 자동으로 채워져요." done={done} optional>
      <Field label="공유 제목">
        <TextInput label="공유 제목" value={draft.share.title} onChange={(v) => set('share.title', v)} placeholder={auto.title} />
      </Field>
      <Field label="공유 설명">
        <TextInput label="공유 설명" value={draft.share.description} onChange={(v) => set('share.description', v)} placeholder={auto.description} />
      </Field>
      <Field
        label="공유 사진"
        hint="카카오톡 공유 카드에 보이는 사진이에요. 가로로 긴 모양(약 2:1)으로 가운데가 잘려서 들어가요."
      >
        <div className="ed-cover-photo ed-share-photo">
          {shareImage ? <img src={shareImage} alt="공유 사진" /> : <span className="ed-photo__loading" />}
          <div className="ed-cover-photo__actions">
            {typeof picked === 'string' ? (
              <span className="ed-photo-badge">새 사진</span>
            ) : (
              <span className="ed-photo-current">{picked ? '고른 사진' : '지금 청첩장 사진'}</span>
            )}
            <FilePicker onFiles={pickImage} className="ed-btn">
              {busy ? '사진 준비 중…' : picked ? '바꾸기' : '다른 사진으로 바꾸기'}
            </FilePicker>
            {picked && (
              <button type="button" className="ed-btn" onClick={resetImage}>
                원래 사진으로
              </button>
            )}
          </div>
        </div>
      </Field>
      <Field
        label="카카오톡 미리보기"
        hint="‘저장’을 누르면 청첩장의 공유하기 버튼으로 보내는 카드에 바로 반영돼요. 카톡방에 주소를 직접 붙였을 때 뜨는 미리보기는 다시 배포해야 바뀌어요."
      >
        <div className="ed-kakao">
          <div className="ed-kakao__card">
            {shareImage ? <img src={shareImage} alt="" /> : <span className="ed-kakao__loading" />}
            <div className="ed-kakao__text">
              <strong>{title}</strong>
              <p>{description}</p>
            </div>
            <span className="ed-kakao__button">모바일 청첩장 보기</span>
          </div>
        </div>
      </Field>
      <Field label="청첩장 주소" hint="배포된 청첩장 주소예요. 잘 모르면 그대로 두세요.">
        <TextInput label="청첩장 주소" value={draft.share.siteUrl} onChange={(v) => set('share.siteUrl', v)} inputMode="url" />
        {urlDiffers && (
          <p className="ed-url-notice">
            지금 배포된 주소({deployedUrl})와 달라요. QR코드와 공유 링크가 이 주소로 연결돼요.
            <button type="button" className="ed-link" onClick={() => set('share.siteUrl', deployedUrl)}>
              배포된 주소로 바꾸기
            </button>
          </p>
        )}
      </Field>
      <Field label="실물 청첩장용 QR코드" hint="종이 청첩장에 넣으면 휴대폰 카메라로 찍어 모바일 청첩장을 열 수 있어요.">
        <QrDownload url={draft.share.siteUrl} />
      </Field>
    </Section>
  )
}

// ---------- 사진 ----------

const MAX_GALLERY = 30

// 눌러서 고르거나, PC에서는 파일을 끌어다 놓을 수 있는 영역 (사진·음악 공용)
function FilePicker({ accept = 'image/*', multiple = false, onFiles, className = '', children }) {
  const [over, setOver] = useState(false)
  return (
    <label
      className={`ed-photo-pick${over ? ' is-over' : ''} ${className}`}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        onFiles(e.dataTransfer.files)
      }}
    >
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="ed-sr-only"
        onChange={(e) => {
          onFiles(e.target.files)
          e.target.value = ''
        }}
      />
      {children}
    </label>
  )
}

// 사진 한 장: 새로 첨부한 사진은 보관소 id(문자열), 이미 청첩장에 올라가 있는 사진은 { src, thumb }.
const isNewPhoto = (entry) => typeof entry === 'string'
const photoKey = (entry) => (isNewPhoto(entry) ? entry : entry.src)
const samePhotos = (a, b) => a.length === b.length && a.every((entry, i) => photoKey(entry) === photoKey(b[i]))

export function PhotoSection({ draft, set, done, urls, current }) {
  const { cover, gallery } = draft.photos
  const [busy, setBusy] = useState('')

  // 지금 청첩장에 올라가 있는 사진
  const liveCover = /\.svg$/i.test(current.cover.image ?? '') ? '' : (current.cover.image ?? '')
  const liveGallery = siteGallery(current.gallery)
  const photoUrl = (entry, size = 'thumb') => (isNewPhoto(entry) ? urls[entry] : asset(entry[size] ?? entry.src))

  const attach = async (fileList, target) => {
    const files = [...fileList].filter((file) => file.type.startsWith('image/') || /.(heic|heif)$/i.test(file.name))
    if (!files.length) return
    const room = target === 'cover' ? 1 : MAX_GALLERY - gallery.length
    const picked = files.slice(0, room)
    if (picked.length < files.length && target === 'gallery') toast(`갤러리 사진은 최대 ${MAX_GALLERY}장까지 넣을 수 있어요.`)
    if (!picked.length) return
    setBusy(`사진을 준비하고 있어요… 0/${picked.length}`)
    const { ids, failed, persistent } = await addPhotos(picked, (n, total) => setBusy(`사진을 준비하고 있어요… ${n}/${total}`))
    setBusy('')
    if (target === 'cover' && ids[0]) {
      if (isNewPhoto(cover)) removeMedia(cover)
      set('photos.cover', ids[0])
    }
    if (target === 'gallery' && ids.length) set('photos.gallery', (list) => [...list, ...ids])
    if (failed.length) toast(`${failed.length}장은 열 수 없어 건너뛰었어요. 아이폰 HEIC 사진은 JPG로 바꿔서 넣어주세요.`)
    else if (!persistent) toast('이 브라우저에서는 사진이 임시 저장되지 않아요. 새로고침하면 다시 골라야 해요.')
  }

  // fromKey 사진을 toKey 사진의 자리로 옮긴다.
  const moveTo = (fromKey, toKey) =>
    set('photos.gallery', (list) => {
      const from = list.findIndex((x) => photoKey(x) === fromKey)
      const to = list.findIndex((x) => photoKey(x) === toKey)
      if (from < 0 || to < 0 || from === to) return list
      const next = [...list]
      next.splice(to, 0, next.splice(from, 1)[0])
      return next
    })
  const sortable = useSortable(gallery.map(photoKey), moveTo)
  const drop = (entry) => {
    sortable.snapshot() // 남은 사진들이 빈자리로 미끄러져 들어오게
    if (isNewPhoto(entry)) removeMedia(entry)
    set('photos.gallery', (list) => list.filter((x) => photoKey(x) !== photoKey(entry)))
  }
  // 키보드: 사진에 초점을 두고 ← → 로 한 칸씩 옮긴다.
  const nudge = (e, i) => {
    const step = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
    const other = gallery[i + step]
    if (!step || !other) return
    e.preventDefault()
    sortable.snapshot()
    moveTo(photoKey(gallery[i]), photoKey(other))
  }
  const dropAll = () => {
    if (!window.confirm('갤러리 사진을 모두 뺄까요? 저장하기 전까지는 청첩장에 그대로 남아 있어요.')) return
    gallery.filter(isNewPhoto).forEach(removeMedia)
    set('photos.gallery', [])
  }
  const restore = () => {
    if (!window.confirm('갤러리를 지금 청첩장에 올라가 있는 사진으로 되돌릴까요? 새로 첨부한 사진은 빠져요.')) return
    gallery.filter(isNewPhoto).forEach(removeMedia)
    set('photos.gallery', liveGallery)
  }
  const dropCover = () => {
    if (isNewPhoto(cover)) removeMedia(cover)
    set('photos.cover', null)
  }

  const coverUrl = cover ? photoUrl(cover, 'src') : ''
  const newCount = gallery.filter(isNewPhoto).length

  return (
    <Section
      id="photos"
      emoji="📷"
      title="사진"
      desc="표지 사진과 갤러리 사진을 고친 뒤 위의 ‘저장’을 누르면 청첩장에 바로 반영돼요."
      done={done}
      optional
    >
      <Field label="표지 사진" hint="세로로 긴 사진이 잘 어울려요.">
        {cover ? (
          <div className="ed-cover-photo">
            {coverUrl ? <img src={coverUrl} alt="표지 사진" /> : <span className="ed-photo__loading" />}
            <div className="ed-cover-photo__actions">
              {isNewPhoto(cover) && <span className="ed-photo-badge">새 사진</span>}
              <FilePicker onFiles={(files) => attach(files, 'cover')} className="ed-btn">
                바꾸기
              </FilePicker>
              <button type="button" className="ed-btn" onClick={dropCover}>
                {liveCover ? '원래 사진으로' : '삭제'}
              </button>
            </div>
          </div>
        ) : liveCover ? (
          <div className="ed-cover-photo">
            <img src={asset(liveCover)} alt="지금 청첩장의 표지 사진" />
            <div className="ed-cover-photo__actions">
              <span className="ed-photo-current">지금 청첩장 사진</span>
              <FilePicker onFiles={(files) => attach(files, 'cover')} className="ed-btn">
                다른 사진으로 바꾸기
              </FilePicker>
            </div>
          </div>
        ) : (
          <FilePicker onFiles={(files) => attach(files, 'cover')} className="ed-photo-drop">
            <PlusIcon />
            표지 사진 고르기
            <small>눌러서 고르거나 사진을 끌어다 놓으세요</small>
          </FilePicker>
        )}
      </Field>

      <Field
        label={`갤러리 사진 ${gallery.length}장${newCount ? ` (새 사진 ${newCount}장)` : ''}`}
        hint="사진을 끌어서 순서를 바꿔요. 휴대폰에서는 사진을 잠깐 누르고 있다가 끌면 돼요. 처음 9장이 먼저 보이고 나머지는 ‘사진 더보기’로 보여요."
      >
        <div className="ed-photo-grid" ref={sortable.gridRef}>
          {gallery.map((entry, i) => {
            const key = photoKey(entry)
            const url = photoUrl(entry)
            return (
              <div
                key={key}
                className={`ed-photo ed-photo--sortable${sortable.activeKey === key ? ' is-dragging' : ''}`}
                tabIndex={0}
                aria-label={`갤러리 사진 ${i + 1}번째. 끌거나 좌우 화살표 키로 순서를 바꿀 수 있어요.`}
                onKeyDown={(e) => nudge(e, i)}
                {...sortable.item(key)}
              >
                {url ? <img src={url} alt="" draggable={false} loading="lazy" /> : <span className="ed-photo__loading" />}
                {isNewPhoto(entry) && <span className="ed-photo__new">새 사진</span>}
                <button type="button" className="ed-photo__remove" aria-label={`${i + 1}번째 사진 빼기`} onClick={() => drop(entry)}>
                  <CloseIcon />
                </button>
              </div>
            )
          })}
          {gallery.length < MAX_GALLERY && (
            <FilePicker multiple onFiles={(files) => attach(files, 'gallery')} className="ed-photo ed-photo--add">
              <PlusIcon />
              사진 추가
            </FilePicker>
          )}
        </div>
        <div className="ed-photo-links">
          {!samePhotos(gallery, liveGallery) && liveGallery.length > 0 && (
            <button type="button" className="ed-link" onClick={restore}>
              지금 청첩장 사진으로 되돌리기
            </button>
          )}
          {gallery.length > 1 && (
            <button type="button" className="ed-link" onClick={dropAll}>
              모두 빼기
            </button>
          )}
        </div>
      </Field>

      {busy && (
        <p className="ed-photo-busy" aria-live="polite">
          {busy}
        </p>
      )}

      <ul className="ed-notes">
        <li>순서를 바꾸거나 빼거나 추가한 내용은 위의 ‘저장’을 눌러야 청첩장에 반영돼요. 그 전까지 청첩장은 그대로예요.</li>
        <li>새 사진은 알맞은 크기로 줄어들고, 촬영 위치 같은 정보는 지워져요.</li>
        <li>
          새로 첨부한 사진은 저장하기 전까지 <b>이 브라우저에만</b> 임시로 남아요.
        </li>
      </ul>
    </Section>
  )
}

// ---------- 배경음악 ----------

// 미리듣기는 한 번에 한 곡만 재생한다.
function usePreviewPlayer() {
  const ref = useRef(null)
  const [playing, setPlaying] = useState(null)

  useEffect(() => () => ref.current?.pause(), [])

  const stop = () => {
    ref.current?.pause()
    setPlaying(null)
  }
  const toggle = (src) => {
    if (playing === src) return stop()
    ref.current ??= new Audio()
    const audio = ref.current
    audio.pause()
    audio.src = src
    audio.onended = () => setPlaying(null)
    audio.play().then(
      () => setPlaying(src),
      () => toast('재생하지 못했어요.'),
    )
  }
  return { playing, toggle, stop }
}

const PlayIcon = ({ playing }) =>
  playing ? (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
      <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
    </svg>
  )

function MusicOption({ checked, disabled = false, onSelect, title, sub, badge, play, children }) {
  return (
    <div
      role="radio"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      className={`ed-music__option${checked ? ' is-checked' : ''}${disabled ? ' is-disabled' : ''}`}
      onClick={() => !disabled && onSelect()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      <span className="ed-music__dot" aria-hidden="true" />
      <span className="ed-music__text">
        <strong>
          {title}
          {badge && <em>{badge}</em>}
        </strong>
        {sub && <small>{sub}</small>}
        {children}
      </span>
      {play && (
        <button
          type="button"
          className={`ed-music__play${play.playing ? ' is-playing' : ''}`}
          aria-label={play.playing ? `${title} 멈추기` : `${title} 미리듣기`}
          onClick={(e) => {
            e.stopPropagation()
            play.onClick()
          }}
        >
          <PlayIcon playing={play.playing} />
        </button>
      )}
    </div>
  )
}

const NOW_PLAYING = '지금 청첩장 음악'

export function MusicSection({ draft, set, done, urls, current }) {
  const player = usePreviewPlayer()
  const [busy, setBusy] = useState(false)
  const { bgm, bgmFile } = draft
  const isPreset = (path) => BGM_PRESETS.some((p) => p.path === path)
  // 지금 청첩장에 흐르는 음악. 기본 제공 곡이 아니면(예: 첨부해서 배포한 audio/bgm.mp3) 따로 한 줄로 보여준다.
  const liveBgm = current?.bgm ?? ''
  const liveCustom = liveBgm && !isPreset(liveBgm) ? liveBgm : null
  // 작성 중인 내용에 지금 청첩장과 다른 경로가 적혀 있으면 그것도 고를 수 있게 보여준다.
  const customPath = bgm && bgm !== 'upload' && !isPreset(bgm) && bgm !== liveCustom ? bgm : null
  const playOf = (src) => (src ? { playing: player.playing === src, onClick: () => player.toggle(src) } : null)

  const attach = async (files) => {
    const file = files[0]
    if (!file) return
    setBusy(true)
    try {
      const { file: info, persistent } = await addAudio(file)
      player.stop()
      if (bgmFile) removeMedia(bgmFile.id)
      set('bgmFile', info)
      set('bgm', 'upload')
      if (!persistent) toast('이 브라우저에서는 음악이 임시 저장되지 않아요. 새로고침하면 다시 골라야 해요.')
    } catch (err) {
      toast(
        err.message === 'size'
          ? `음악 파일은 ${MAX_AUDIO_SIZE_MB}MB 이하로 넣어주세요.`
          : '재생할 수 없는 파일이에요. mp3나 m4a 파일을 넣어주세요.',
      )
    } finally {
      setBusy(false)
    }
  }

  const removeFile = () => {
    player.stop()
    removeMedia(bgmFile.id)
    set('bgmFile', null)
    if (bgm === 'upload') set('bgm', '')
  }

  return (
    <Section
      id="music"
      emoji="🎵"
      title="배경음악"
      desc="청첩장에 흐를 음악을 골라주세요. ▶를 누르면 미리 들어볼 수 있어요. 지금 청첩장에 흐르는 음악에는 ‘지금 청첩장 음악’ 표시가 있어요."
      done={done}
      optional
    >
      <div className="ed-music" role="radiogroup" aria-label="배경음악">
        <MusicOption
          checked={!bgm}
          onSelect={() => set('bgm', '')}
          title="음악 없음"
          badge={liveBgm ? '' : NOW_PLAYING}
          sub="음악 버튼이 보이지 않아요"
        />
        {liveCustom && (
          <MusicOption
            checked={bgm === liveCustom}
            onSelect={() => set('bgm', liveCustom)}
            title={NOW_PLAYING}
            sub={`직접 넣은 음악 · ${liveCustom.split('/').pop()}`}
            play={playOf(asset(liveCustom))}
          />
        )}
        {BGM_PRESETS.map((p) => (
          <MusicOption
            key={p.id}
            checked={bgm === p.path}
            onSelect={() => set('bgm', p.path)}
            title={p.title}
            badge={liveBgm === p.path ? `${p.mood} · ${NOW_PLAYING}` : p.mood}
            sub={`${p.credit} · ${formatDuration(p.duration)}`}
            play={playOf(asset(p.path))}
          />
        ))}
        {customPath && (
          <MusicOption checked onSelect={() => {}} title="직접 적은 음악 경로" sub={customPath} play={playOf(asset(customPath))} />
        )}
        <MusicOption
          checked={bgm === 'upload'}
          disabled={!bgmFile}
          onSelect={() => set('bgm', 'upload')}
          title={bgmFile ? bgmFile.name : '직접 첨부한 음악'}
          sub={bgmFile ? `첨부한 파일 · ${formatDuration(bgmFile.duration)}` : `mp3·m4a 파일, ${MAX_AUDIO_SIZE_MB}MB 이하`}
          play={bgmFile ? playOf(urls[bgmFile.id]) : null}
        >
          <span className="ed-music__actions" onClick={(e) => e.stopPropagation()}>
            <FilePicker accept="audio/*,.mp3,.m4a,.aac" onFiles={attach} className="ed-btn ed-btn--sm">
              {busy ? '확인 중…' : bgmFile ? '다른 파일로 바꾸기' : '음악 파일 고르기'}
            </FilePicker>
            {bgmFile && (
              <button type="button" className="ed-btn ed-btn--sm" onClick={removeFile}>
                삭제
              </button>
            )}
          </span>
        </MusicOption>
      </div>

      <ul className="ed-notes">
        <li>휴대폰은 자동 재생을 막기 때문에, 하객이 청첩장 오른쪽 위 음악 버튼을 누르면 재생돼요.</li>
        <li>음악은 끝나면 처음부터 다시 반복돼요.</li>
        <li>기본 제공 곡은 ‘저장’을 누르면 바로 바뀌어요. 직접 첨부한 음악은 파일이 커서, 맨 아래 내려받기로 개발자에게 전달해야 바뀌어요.</li>
        <li>아이폰에서는 ‘파일’ 앱에 저장된 음악만 고를 수 있어요. 직접 첨부할 때는 사용 권한이 있는 음악인지 확인해주세요.</li>
      </ul>
    </Section>
  )
}
