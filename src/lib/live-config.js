// 편집 화면(/edit)에서 "저장"한 내용은 Supabase(site_config)에 올라가고,
// 청첩장은 열릴 때 그 내용을 빌드된 설정(wedding.js + 비공개 정보) 위에 덮어쓴다.
// 그래서 글·계좌·디자인 같은 내용은 다시 배포하지 않아도 바로 바뀐다.
// 사진(표지·갤러리)과 첨부한 음악은 빌드할 때 만들어지는 파일이라 여기서 바꾸지 않는다.
import { wedding as publicWedding } from '../config/wedding.js'
import { withPrivate } from '../config/private.js'
import { fetchSiteConfig } from './api.js'

export const builtConfig = withPrivate(publicWedding, __WEDDING_PRIVATE__)

const CACHE_KEY = 'wedding:live-config'
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

// 저장된 내용을 빌드된 설정 위에 합친다. 사진 경로는 저장된 내용에 있어도 쓰지 않는다.
export function applyLive(saved) {
  if (!isPlainObject(saved)) return builtConfig
  const { gallery: _gallery, cover, ...rest } = saved
  const caption = isPlainObject(cover) && typeof cover.caption === 'string' ? { cover: { caption: cover.caption } } : {}
  return withPrivate(builtConfig, { ...rest, ...caption })
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
