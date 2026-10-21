// public/ 폴더 기준 경로를 배포 base 경로에 맞게 바꿔준다. 외부 URL은 그대로 둔다.
export function asset(path) {
  if (!path) return ''
  // blob: 은 편집 페이지에서 첨부한 사진의 미리보기 주소
  if (/^(https?:)?\/\//.test(path) || /^(data|blob):/.test(path)) return path
  return import.meta.env.BASE_URL + path.replace(/^\//, '')
}
