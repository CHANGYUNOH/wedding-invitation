// 편집 페이지에서 첨부한 사진·음악 파일을 IndexedDB에 보관해 새로고침해도 남게 한다.
// 사진은 브라우저에서 줄이고(촬영 위치 등 메타데이터 제거), 음악은 그대로 보관한다.
// 입력 내용(draft)에는 파일 id만 저장한다.
import { useEffect, useState } from 'react'

const MAX_SIDE = 2400 // 원본 보관용. 실제 청첩장에는 npm run photos 가 다시 줄여 넣는다.
const QUALITY = 0.9
const DB_NAME = 'wedding-editor'
const STORE = 'photos' // 예전에 저장한 사진을 그대로 읽도록 이름을 유지한다
const MAX_AUDIO_MB = 15

const cache = new Map() // id → { blob, url }
const listeners = new Set()
let persistent = true // IndexedDB를 쓸 수 없으면 false (새로고침하면 첨부 파일이 사라짐)

const notify = () => listeners.forEach((fn) => fn())

// ---------- IndexedDB ----------

let dbPromise = null
function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function tx(mode, run) {
  const store = (await db()).transaction(STORE, mode).objectStore(STORE)
  return new Promise((resolve, reject) => {
    const req = run(store)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function persist(id, blob) {
  try {
    await tx('readwrite', (s) => s.put(blob, id))
  } catch {
    persistent = false
  }
}

// ---------- 사진 줄이기 ----------

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ img, url })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('unsupported'))
    }
    img.src = url
  })
}

// 브라우저는 사진의 회전 정보를 반영해 그리므로, 캔버스로 다시 저장하면 방향은 맞고 메타데이터는 빠진다.
async function shrink(file) {
  const { img, url } = await loadImage(file)
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    return await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', QUALITY),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}

// ---------- 음악 ----------

// 브라우저가 재생할 수 있는 음악인지 확인하고 길이(초)를 잰다.
function probeAudio(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()
    const done = (fn) => (value) => {
      URL.revokeObjectURL(url)
      clearTimeout(timer)
      fn(value)
    }
    const timer = setTimeout(done(reject), 10000, new Error('unsupported'))
    audio.onloadedmetadata = () => done(resolve)(audio.duration)
    audio.onerror = () => done(reject)(new Error('unsupported'))
    audio.preload = 'metadata'
    audio.src = url
  })
}

// 음악 파일을 보관한다. 너무 크거나(size) 재생할 수 없으면(unsupported) 오류를 던진다.
export async function addAudio(file) {
  if (file.size > MAX_AUDIO_MB * 1024 * 1024) throw new Error('size')
  const duration = await probeAudio(file)
  const ext = (file.name.match(/.([a-z0-9]{2,4})$/i)?.[1] ?? 'mp3').toLowerCase()
  const blob = file.slice(0, file.size, file.type || 'audio/mpeg')
  const id = crypto.randomUUID()
  cache.set(id, { blob, url: URL.createObjectURL(blob) })
  await persist(id, blob)
  notify()
  return { file: { id, name: file.name, ext, duration: Math.round(duration) }, persistent }
}
export const MAX_AUDIO_SIZE_MB = MAX_AUDIO_MB

// ---------- 공개 함수 ----------

// 파일들을 줄여 보관하고 새 id 목록을 돌려준다. 열 수 없는 파일(예: PC의 HEIC)은 failed 에 담긴다.
export async function addPhotos(files, onProgress) {
  const ids = []
  const failed = []
  let done = 0
  for (const file of files) {
    try {
      const blob = await shrink(file)
      const id = crypto.randomUUID()
      cache.set(id, { blob, url: URL.createObjectURL(blob) })
      await persist(id, blob)
      ids.push(id)
    } catch {
      failed.push(file.name)
    }
    onProgress?.(++done, files.length)
  }
  notify()
  return { ids, failed, persistent }
}

export async function removeMedia(id) {
  const item = cache.get(id)
  if (item) URL.revokeObjectURL(item.url)
  cache.delete(id)
  notify()
  try {
    await tx('readwrite', (s) => s.delete(id))
  } catch {
    // 보관소를 못 쓰는 환경이면 메모리에서만 지우면 된다.
  }
}

export async function clearMedia() {
  cache.forEach(({ url }) => URL.revokeObjectURL(url))
  cache.clear()
  notify()
  try {
    await tx('readwrite', (s) => s.clear())
  } catch {
    // 위와 같음
  }
}

export const mediaBlob = (id) => cache.get(id)?.blob ?? null
export const isPersistent = () => persistent

// 보관된 파일을 불러와 미리보기용 주소(blob:)를 만든다.
export async function loadMedia(ids) {
  const missing = ids.filter((id) => !cache.has(id))
  if (!missing.length) return
  for (const id of missing) {
    try {
      const blob = await tx('readonly', (s) => s.get(id))
      if (blob) cache.set(id, { blob, url: URL.createObjectURL(blob) })
    } catch {
      persistent = false
    }
  }
  notify()
}

// ids 에 해당하는 파일 주소 { id: url } 를 돌려주고, 파일이 바뀌면 다시 그린다.
export function useMediaUrls(ids) {
  const [, setTick] = useState(0)
  const key = ids.join(',')

  useEffect(() => {
    const rerender = () => setTick((t) => t + 1)
    listeners.add(rerender)
    return () => listeners.delete(rerender)
  }, [])

  useEffect(() => {
    loadMedia(key ? key.split(',') : [])
  }, [key])

  return Object.fromEntries(ids.filter((id) => cache.has(id)).map((id) => [id, cache.get(id).url]))
}
