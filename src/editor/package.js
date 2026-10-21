// 입력 내용(wedding.js)과 첨부 사진을 프로젝트 폴더 구조 그대로 ZIP 하나로 묶는다.
// 내려받기를 누를 때만 불러오는 모듈이라, 압축 라이브러리가 다른 화면을 무겁게 하지 않는다.
import { strToU8, zipSync } from 'fflate'
import { toWeddingJs } from './exportConfig.js'
import { loadPhotos, photoBlob } from './photos.js'

const README = `청첩장 정보 입력 페이지에서 내보낸 파일입니다.

[반영 방법]
1. 이 압축 파일을 프로젝트 폴더(wedding-invitation)에 그대로 풉니다.
   - src/config/wedding.js 가 새 입력 내용으로 바뀝니다.
   - 사진은 photos/ 폴더에 들어갑니다. 기존 photos/gallery 사진이 있다면 먼저 비워주세요.
2. npm run build 로 확인합니다. 사진은 이때 자동으로 줄어 public/images 에 들어갑니다.
3. 바뀐 파일(src/config, public/images)을 커밋하고 push 하면 배포됩니다.
`

const pad = (n) => String(n).padStart(2, '0')

export function packageName(now = new Date()) {
  return `wedding-invitation-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.zip`
}

export async function buildPackage(draft) {
  const { cover, gallery } = draft.photos
  await loadPhotos([cover, ...gallery].filter(Boolean))

  // 메모장에서도 한글이 깨지지 않도록 BOM을 붙인다.
  const files = {
    'src/config/wedding.js': strToU8(toWeddingJs(draft)),
    'README.txt': strToU8(`﻿${README}`),
  }
  // 사진은 이미 압축된 JPG라 다시 압축하지 않고 담기만 한다.
  const add = async (path, id) => {
    const blob = photoBlob(id)
    if (blob) files[path] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }]
  }
  if (cover) await add('photos/cover.jpg', cover)
  for (const [i, id] of gallery.entries()) await add(`photos/gallery/${pad(i + 1)}.jpg`, id)

  return new Blob([zipSync(files)], { type: 'application/zip' })
}
