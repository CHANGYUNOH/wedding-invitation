import { wedding } from '../config/wedding.js'
import { asset } from '../lib/asset.js'
import { kstParts, formatKoreanDate, formatKoreanTime, WEEKDAYS_EN } from '../lib/date.js'
import './Cover.css'

const when = kstParts(new Date(wedding.datetime))
const pad = (n) => String(n).padStart(2, '0')

export default function Cover() {
  const { groom, bride, venue, cover } = wedding

  return (
    <header className="cover">
      <div className="cover__date" aria-hidden="true">
        <span className="cover__year">{when.year}</span>
        <span className="cover__md">
          {pad(when.month)}
          <span className="cover__slash">/</span>
          {pad(when.day)}
        </span>
        <span className="cover__weekday">{WEEKDAYS_EN[when.weekday]}</span>
      </div>

      <figure className="cover__photo">
        <img src={asset(cover.image)} alt={`${groom.name}, ${bride.name} 웨딩 사진`} fetchPriority="high" />
      </figure>

      <p className="cover__caption">{cover.caption}</p>

      <h1 className="cover__names">
        {groom.name}
        <span className="cover__and">·</span>
        {bride.name}
      </h1>

      <p className="cover__info">
        {formatKoreanDate(when)} {formatKoreanTime(when)}
        <br />
        {venue.name} {venue.hall}
      </p>

      <div className="cover__scroll" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22">
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </div>
    </header>
  )
}
