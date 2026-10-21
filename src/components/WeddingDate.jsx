import { useEffect, useState } from 'react'
import { useWedding } from '../lib/wedding-context.jsx'
import { orderedHosts } from '../lib/hosts.js'
import {
  kstParts,
  formatKoreanDate,
  formatKoreanTime,
  daysUntil,
  monthMatrix,
  WEEKDAYS_KO,
} from '../lib/date.js'
import Section from './Section.jsx'
import Reveal from './Reveal.jsx'
import './WeddingDate.css'

function useNow(intervalMs) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

function Countdown({ target }) {
  const wedding = useWedding()
  const now = useNow(1000)
  const diff = Math.max(0, target - now)
  const units = [
    { label: 'DAYS', value: Math.floor(diff / 86_400_000) },
    { label: 'HOUR', value: Math.floor(diff / 3_600_000) % 24 },
    { label: 'MIN', value: Math.floor(diff / 60_000) % 60 },
    { label: 'SEC', value: Math.floor(diff / 1000) % 60 },
  ]
  // 남은 일수는 위 카운트다운의 DAYS와 맞추고, 당일·지난 날짜 판단만 달력 기준으로 한다.
  const calendarDays = daysUntil(target, now)
  const days = calendarDays > 0 ? units[0].value : calendarDays
  const [first, second] = orderedHosts(wedding)
  const couple = (
    <>
      {first.shortName} <span className="countdown__heart">♥</span> {second.shortName}
    </>
  )

  return (
    <>
      <div className="countdown" role="timer" aria-label={`예식까지 ${units[0].value}일 남음`}>
        {units.map((u, i) => (
          <div key={u.label} className="countdown__unit">
            {i > 0 && <span className="countdown__colon" aria-hidden="true">:</span>}
            <span className="countdown__label">{u.label}</span>
            <span className="countdown__value">{String(u.value).padStart(2, '0')}</span>
          </div>
        ))}
      </div>
      <p className="countdown__message">
        {days > 0 && (
          <>
            {couple}의 결혼식이 <strong>{days}일</strong> 남았습니다.
          </>
        )}
        {days === 0 && calendarDays > 0 && <>내일은 {couple}의 결혼식 날입니다.</>}
        {calendarDays === 0 && <>오늘은 {couple}의 결혼식 날입니다.</>}
        {days < 0 && (
          <>
            {couple}의 결혼식이 <strong>{-days}일</strong> 지났습니다.
          </>
        )}
      </p>
    </>
  )
}

export default function WeddingDate() {
  const wedding = useWedding()
  const target = new Date(wedding.datetime)
  const when = kstParts(target)
  const weeks = monthMatrix(when.year, when.month)

  return (
    <Section id="date" eyebrow="Wedding Day" title="예식 일시" soft>
      <Reveal>
        <p className="date__headline">
          {formatKoreanDate(when)}
          <br />
          {formatKoreanTime(when)}
        </p>
      </Reveal>

      <Reveal className="calendar">
        <p className="calendar__month">{when.month}월</p>
        <table className="calendar__table">
          <thead>
            <tr>
              {WEEKDAYS_KO.map((d, i) => (
                <th key={d} className={i === 0 ? 'is-sunday' : i === 6 ? 'is-saturday' : undefined}>
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wi) => (
              <tr key={wi}>
                {week.map((day, di) => {
                  const isWedding = day === when.day
                  const cls = [di === 0 && 'is-sunday', di === 6 && 'is-saturday', isWedding && 'is-wedding']
                    .filter(Boolean)
                    .join(' ')
                  return (
                    <td key={di} className={cls || undefined} aria-current={isWedding ? 'date' : undefined}>
                      {day && <span>{day}</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Reveal>

      <Reveal>
        <Countdown target={target} />
      </Reveal>
    </Section>
  )
}
