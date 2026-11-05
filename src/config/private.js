// 실명·계좌번호처럼 git에 올리지 않는 정보를 wedding.js 위에 덮어쓴다.
// 값은 vite.config.js 가 빌드할 때 WEDDING_PRIVATE 환경변수나 wedding.private.json 에서 읽어 넣는다.
// 객체는 안쪽까지 합치고, 배열(계좌 목록 등)과 그 밖의 값은 통째로 바꾼다.

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

export function withPrivate(base, overrides) {
  if (!isPlainObject(overrides)) return base
  const merged = { ...base }
  for (const [key, value] of Object.entries(overrides)) {
    merged[key] = isPlainObject(value) && isPlainObject(base[key]) ? withPrivate(base[key], value) : value
  }
  return merged
}
