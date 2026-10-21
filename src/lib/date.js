const TIME_ZONE = 'Asia/Seoul'
const WEEKDAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토']
export const WEEKDAYS_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
export const WEEKDAYS_EN_FULL = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']

const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
  weekday: 'short',
})

// 기기 시간대와 관계없이 한국 시간 기준 연·월·일·시·분·요일을 돌려준다.
export function kstParts(date) {
  const parts = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]))
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: WEEKDAY_KEYS.indexOf(parts.weekday),
  }
}

export function formatKoreanDate({ year, month, day, weekday }) {
  return `${year}년 ${month}월 ${day}일 ${WEEKDAYS_KO[weekday]}요일`
}

export function formatKoreanTime({ hour, minute }) {
  const period = hour < 12 ? '오전' : hour === 12 ? '낮' : '오후'
  const h = hour > 12 ? hour - 12 : hour
  return `${period} ${h}시${minute ? ` ${minute}분` : ''}`
}

export function formatDotDate({ year, month, day }) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${year}. ${pad(month)}. ${pad(day)}`
}

// 한국 시간 기준 오늘과 예식일 사이의 날짜 차이 (예식일이 지나면 음수)
export function daysUntil(target, now = new Date()) {
  const a = kstParts(now)
  const b = kstParts(target)
  const toDayNumber = (p) => Date.UTC(p.year, p.month - 1, p.day) / 86_400_000
  return toDayNumber(b) - toDayNumber(a)
}

export function monthMatrix(year, month) {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}
