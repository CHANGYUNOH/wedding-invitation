import { useState } from 'react'
import { orderedHosts, parentName } from '../lib/hosts.js'
import { kstParts, formatKoreanDate, formatKoreanTime } from '../lib/date.js'
import { hasKakaoKey, getKakaoMaps } from '../lib/kakao.js'
import { asset } from '../lib/asset.js'
import { GREETING_TEMPLATES, autoShareText, hasCoords, isValidDatetime, shortNameOf } from './draft.js'
import { Check, CloseIcon, Datalist, Field, IconButton, PlusIcon, Row, Section, TextArea, TextInput } from './ui.jsx'

const RELATIONS = ['아들', '장남', '차남', '삼남', '막내아들', '외아들', '딸', '장녀', '차녀', '삼녀', '막내딸', '외동딸']
const BANKS = [
  '국민은행', '신한은행', '우리은행', '하나은행', '농협', '기업은행', '카카오뱅크', '토스뱅크', '케이뱅크',
  'SC제일은행', '씨티은행', '부산은행', 'iM뱅크(대구)', '경남은행', '광주은행', '전북은행', '제주은행',
  '새마을금고', '신협', '우체국', '수협', '산업은행',
]
const TRANSPORT_TITLES = ['지하철', '버스', '자가용', '주차', '셔틀버스', '기차', '고속버스']

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
            placeholder={shortNameOf({ ...draft.groom, shortName: '' }) || '예: 찬규'}
          />
        </Field>
        <Field label="신부 부르는 이름" className="ed-field--compact">
          <TextInput
            label="신부 부르는 이름"
            value={draft.bride.shortName}
            onChange={(v) => set('bride.shortName', v)}
            placeholder={shortNameOf({ ...draft.bride, shortName: '' }) || '예: 수경'}
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

export function ShareSection({ draft, set, done }) {
  const auto = autoShareText(draft)
  const title = draft.share.title.trim() || auto.title
  const description = draft.share.description.trim() || auto.description

  return (
    <Section id="share" emoji="🔗" title="공유 설정" desc="카카오톡으로 보낼 때 보이는 문구예요. 비워두면 입력한 정보로 자동으로 채워져요." done={done} optional>
      <Field label="공유 제목">
        <TextInput label="공유 제목" value={draft.share.title} onChange={(v) => set('share.title', v)} placeholder={auto.title} />
      </Field>
      <Field label="공유 설명">
        <TextInput label="공유 설명" value={draft.share.description} onChange={(v) => set('share.description', v)} placeholder={auto.description} />
      </Field>
      <Field label="카카오톡 미리보기">
        <div className="ed-kakao">
          <div className="ed-kakao__card">
            <img src={asset(draft.share.image)} alt="" />
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
      </Field>
    </Section>
  )
}

// ---------- 사진·음악 ----------

export function MediaNote() {
  return (
    <Section id="media" emoji="📷" title="사진·배경음악" desc="사진과 음악 파일은 이 페이지에서 올릴 수 없어요.">
      <ul className="ed-notes">
        <li>
          <b>커버 사진 1장</b>과 <b>갤러리 사진</b>(원하는 순서대로 번호를 붙여서)을 원본 그대로 개발자에게 전달해주세요. 크기는 자동으로 줄어들어요.
        </li>
        <li>아이폰 사진은 JPG로 내보내서 보내주시면 좋아요.</li>
        <li>
          <b>배경음악</b>을 넣고 싶다면 mp3 파일을 함께 전달해주세요.
        </li>
      </ul>
    </Section>
  )
}
