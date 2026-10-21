/**
 * 모바일 청첩장 RSVP·방명록 저장용 Google Apps Script
 *
 * Apps Script 편집기에 이 파일 내용을 그대로 붙여넣고, setup 함수를 한 번 실행한 뒤
 * "웹 앱"으로 배포하세요. (자세한 순서는 README 참고)
 *
 * - 구글 시트의 확장 프로그램 > Apps Script 에서 열었다면 그 시트에 저장합니다.
 * - script.google.com 에서 따로 만들었다면 setup 이 내 드라이브에 '청첩장 응답' 시트를 새로 만들고,
 *   실행 로그에 시트 주소를 알려줍니다.
 *
 * - '참석 의사' 시트: 하객이 보낸 참석 여부가 한 줄씩 쌓입니다.
 * - '방명록' 시트: 축하 메시지가 쌓입니다. 숨긴 열(id·salt·hash)은 삭제 비밀번호 확인용이니 지우지 마세요.
 *   이상한 글은 시트에서 그 줄을 지우면 청첩장에서도 사라집니다.
 */

const SHEETS = {
  rsvp: { name: '참석 의사', headers: ['제출 시각', '구분', '성함', '참석 여부', '인원', '식사'] },
  guestbook: { name: '방명록', headers: ['작성 시각', '이름', '메시지', 'id', 'salt', 'hash'] },
}
const SIDE_LABEL = { groom: '신랑측', bride: '신부측' }
const MEAL_LABEL = { yes: '예정', no: '안 함', undecided: '미정' }
const MAX_HEADCOUNT = 10

// 처음 한 번 실행: 시트와 머리글을 만든다.
function setup() {
  let ss = spreadsheet()
  if (!ss) {
    try {
      ss = SpreadsheetApp.create('청첩장 응답')
    } catch (err) {
      // 여러 구글 계정에 동시에 로그인했거나, 회사(Workspace) 계정 정책으로 파일 생성이 막힌 경우
      throw new Error(
        `새 시트를 만들 권한이 없습니다 (${err.message}). ` +
          '개인 Gmail 계정 하나로만 로그인한 창(시크릿 창 등)에서 구글 시트를 직접 만들고, ' +
          '그 시트의 확장 프로그램 > Apps Script 에 코드를 붙여넣어 setup 을 실행해주세요.',
      )
    }
    PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId())
  }
  ss.setSpreadsheetTimeZone('Asia/Seoul')
  Object.keys(SHEETS).forEach((key) => {
    const { name, headers } = SHEETS[key]
    const sheet = ss.getSheetByName(name) || ss.insertSheet(name)
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold')
    sheet.setFrozenRows(1)
  })
  ss.getSheetByName(SHEETS.guestbook.name).hideColumns(4, 3)
  // 새 스프레드시트에 기본으로 있는 빈 시트는 정리한다.
  ss.getSheets()
    .filter((s) => !Object.keys(SHEETS).some((k) => SHEETS[k].name === s.getName()) && s.getLastRow() === 0)
    .forEach((s) => ss.deleteSheet(s))
  console.log(`준비 완료. 응답이 쌓일 시트: ${ss.getUrl()}`)
}

// 문제 확인용: 지금 스크립트를 실행하는 구글 계정과 연결된 시트를 실행 로그에 보여준다.
function check() {
  console.log(`실행 계정: ${Session.getEffectiveUser().getEmail() || '(확인 불가)'}`)
  const active = SpreadsheetApp.getActiveSpreadsheet()
  console.log(
    active
      ? `연결된 시트: ${active.getName()} (${active.getUrl()})`
      : '연결된 시트: 없음 — 시트 밖(script.google.com)에서 만든 스크립트입니다. 시트의 확장 프로그램 > Apps Script 에서 열어주세요.',
  )
}

// 시트 메뉴에서 연 스크립트면 그 시트, 따로 만든 스크립트면 setup 이 만든 시트를 쓴다.
function spreadsheet() {
  const active = SpreadsheetApp.getActiveSpreadsheet()
  if (active) return active
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
  return id ? SpreadsheetApp.openById(id) : null
}

function doGet(e) {
  return respond(() => {
    const p = e.parameter
    if (p.action === 'guestbook') return listGuestbook(Number(p.offset) || 0, Number(p.limit) || 5)
    if (p.action === 'ping') return {}
    throw new Error('알 수 없는 요청입니다.')
  })
}

function doPost(e) {
  return respond(() => {
    const body = JSON.parse(e.postData.contents)
    if (body.action === 'rsvp') return addRsvp(body)
    if (body.action === 'addGuestbook') return addGuestbook(body)
    if (body.action === 'deleteGuestbook') return deleteGuestbook(body)
    throw new Error('알 수 없는 요청입니다.')
  })
}

// ---------- 참석 의사 ----------

function addRsvp(b) {
  const name = text(b.name, 30, '성함')
  const side = oneOf(SIDE_LABEL, b.side, '구분')
  const attending = b.attending === true
  const headcount = attending ? int(b.headcount, 1, MAX_HEADCOUNT, '인원') : 0
  const meal = attending ? oneOf(MEAL_LABEL, b.meal, '식사 여부') : MEAL_LABEL.no
  withLock(() =>
    sheet('rsvp').appendRow([new Date(), side, safe(name), attending ? '참석' : '불참', headcount, meal]),
  )
  return {}
}

// ---------- 방명록 ----------

function listGuestbook(offset, limit) {
  // 최신순. 같은 시각이면 아래 줄(나중에 쓴 글)이 먼저.
  const items = guestbookRows()
    .sort((a, b) => new Date(b.values[0]) - new Date(a.values[0]) || b.index - a.index)
    .map(({ values }) => ({
      id: String(values[3]),
      created_at: new Date(values[0]).toISOString(),
      name: String(values[1]),
      message: String(values[2]),
    }))
  const size = Math.min(Math.max(limit, 1), 50)
  return { items: items.slice(offset, offset + size), hasMore: items.length > offset + size }
}

function addGuestbook(b) {
  const name = text(b.name, 20, '이름')
  const message = text(b.message, 300, '메시지')
  const password = String(b.password ?? '')
  if (password.length < 4 || password.length > 20) throw new Error('비밀번호는 4~20자로 입력해주세요.')
  const salt = Utilities.getUuid()
  // hash는 base64라 + 로 시작할 수 있으므로 함께 글자로 저장한다.
  withLock(() =>
    sheet('guestbook').appendRow([
      new Date(),
      safe(name),
      safe(message),
      Utilities.getUuid(),
      salt,
      safe(hash(salt, password)),
    ]),
  )
  return {}
}

// 비밀번호가 맞으면 지우고 { deleted: true }, 틀리면 { deleted: false }
function deleteGuestbook(b) {
  const id = String(b.id ?? '')
  const password = String(b.password ?? '')
  return withLock(() => {
    const row = guestbookRows().find(({ values }) => String(values[3]) === id)
    if (!row || hash(String(row.values[4]), password) !== String(row.values[5])) return { deleted: false }
    sheet('guestbook').deleteRow(row.index)
    return { deleted: true }
  })
}

function guestbookRows() {
  const s = sheet('guestbook')
  const count = s.getLastRow() - 1
  if (count < 1) return []
  return s
    .getRange(2, 1, count, SHEETS.guestbook.headers.length)
    .getValues()
    .map((values, i) => ({ values, index: i + 2 }))
    .filter(({ values }) => values[3])
}

// ---------- 공통 ----------

function respond(fn) {
  let result
  try {
    result = Object.assign({ ok: true }, fn())
  } catch (err) {
    result = { ok: false, error: String((err && err.message) || err) }
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON)
}

function sheet(key) {
  const s = spreadsheet()?.getSheetByName(SHEETS[key].name)
  if (!s) throw new Error('시트가 없습니다. Apps Script에서 setup 함수를 먼저 실행해주세요.')
  return s
}

function withLock(fn) {
  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    return fn()
  } finally {
    lock.releaseLock()
  }
}

function hash(salt, password) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + password, Utilities.Charset.UTF_8)
  return Utilities.base64Encode(bytes)
}

function text(value, max, label) {
  const s = String(value ?? '').trim()
  if (!s) throw new Error(`${label}을(를) 입력해주세요.`)
  if (s.length > max) throw new Error(`${label}은(는) ${max}자 이내로 입력해주세요.`)
  return s
}

function int(value, min, max, label) {
  const n = Number(value)
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${label}이(가) 올바르지 않습니다.`)
  return n
}

function oneOf(labels, key, label) {
  if (!Object.prototype.hasOwnProperty.call(labels, key)) throw new Error(`${label}이(가) 올바르지 않습니다.`)
  return labels[key]
}

// 하객이 =, +, -, @ 로 시작하는 글을 쓰면 시트가 수식으로 실행하므로 글자로 저장되게 한다.
function safe(s) {
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
}
