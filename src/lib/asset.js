// public/ 폴더 기준 경로를 배포 base 경로에 맞게 바꿔준다. 외부 URL은 그대로 둔다.
export function asset(path) {
  if (!path) return ''
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path
  return import.meta.env.BASE_URL + path.replace(/^\//, '')
}
