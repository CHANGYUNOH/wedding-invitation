// 편집 화면(/edit)에서 "저장"한 내용은 Supabase(site_config)에 올라가고,
// 청첩장은 열릴 때 그 내용을 빌드된 설정(wedding.js + 비공개 정보) 위에 덮어쓴다.
// 그래서 글·계좌·디자인·사진·음악은 다시 배포하지 않아도 바로 바뀐다.
// 편집 화면에서 새로 올린 사진·음악은 Supabase Storage 에 있고, 저장된 내용에는 그 주소가 적힌다.
import { wedding as publicWedding } from '../config/wedding.js'
import { withPrivate } from '../config/private.js'
import { fetchSiteConfig } from './api.js'

export const builtConfig = withPrivate(publicWedding, __WEDDING_PRIVATE__)

const CACHE_KEY = 'wedding:live-config'
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

const text = (v) => (typeof v === 'string' && v ? v : null)

// 저장된 내용을 빌드된 설정 위에 합친다. 사진 항목은 모양이 맞는 것만 받고, 없으면 빌드된 사진을 그대로 쓴다.
export function applyLive(saved) {
  if (!isPlainObject(saved)) return builtConfig
  const { gallery, cover, ...rest } = saved
  const overrides = { ...rest }
  if (isPlainObject(cover)) {
    overrides.cover = {
      ...(typeof cover.caption === 'string' ? { caption: cover.caption } : {}),
      ...(text(cover.image) ? { image: cover.image } : {}),
    }
  }
  if (Array.isArray(gallery)) {
    overrides.gallery = gallery
      .filter((p) => isPlainObject(p) && text(p.src))
      .map((p) => ({ src: p.src, thumb: text(p.thumb) ?? p.src }))
  }
  return withPrivate(builtConfig, overrides)
}

// 지난번에 받아둔 내용. 다시 방문한 하객에게 예전 내용이 잠깐 보였다가 바뀌는 일을 줄인다.
export function cachedLiveConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY))
    return isPlainObject(saved) ? applyLive(saved) : null
  } catch {
    return null
  }
}

// 서버에 저장된 내용을 받아 합친 설정을 돌려준다. 저장된 내용이 없으면 빌드된 설정 그대로다.
export async function loadLiveConfig() {
  const row = await fetchSiteConfig()
  const saved = isPlainObject(row?.config) ? row.config : null
  try {
    if (saved) localStorage.setItem(CACHE_KEY, JSON.stringify(saved))
    else localStorage.removeItem(CACHE_KEY)
  } catch {
    // 저장소를 쓸 수 없으면 다음 방문 때 다시 받으면 된다.
  }
  return applyLive(saved)
}
