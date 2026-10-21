// photos/ 폴더의 원본 사진을 모바일용 크기로 줄여 public/images/ 에 저장하고,
// 갤러리 목록을 src/config/photos.generated.js 로 만든다.
//
//   photos/cover.jpg          → public/images/cover.jpg            (가로 1200px)
//   photos/gallery/*.jpg      → public/images/gallery/01.jpg …     (긴 변 1600px)
//                             → public/images/gallery/thumbs/01.jpg (480px 정사각형)
//
// 갤러리 순서는 파일 이름순입니다 (01_xxx.jpg, 02_xxx.jpg 처럼 숫자를 붙이면 편합니다).
// 사진의 촬영 위치(GPS) 등 메타데이터는 모두 제거됩니다.
// photos/ 폴더가 없으면(예: Vercel 빌드) 아무것도 하지 않고 기존 결과물을 그대로 씁니다.
// 다른 폴더의 사진을 쓰려면 PHOTOS_DIR=폴더경로 npm run photos 처럼 실행합니다.

import sharp from 'sharp'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SRC_DIR = process.env.PHOTOS_DIR ? resolve(process.env.PHOTOS_DIR) : join(ROOT, 'photos')
const OUT_DIR = join(ROOT, 'public', 'images')
const MANIFEST = join(ROOT, 'src', 'config', 'photos.generated.js')
const CACHE = join(SRC_DIR, '.cache.json')

const INPUT_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.avif', '.tif', '.tiff'])
const JPEG = { quality: 80, mozjpeg: true }
const COVER_WIDTH = 1200
const FULL_SIZE = 1600
const THUMB_SIZE = 480

if (!existsSync(SRC_DIR)) {
  console.log('[photos] photos/ 폴더가 없어 사진 처리를 건너뜁니다.')
  process.exit(0)
}

const readCache = () => {
  try {
    return JSON.parse(readFileSync(CACHE, 'utf8'))
  } catch {
    return {}
  }
}
const oldCache = readCache()
const newCache = {}
const pad = (n) => String(n).padStart(2, '0')
const isImage = (name) => INPUT_EXT.has(extname(name).toLowerCase())
const listImages = (dir) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter(isImage)
        .sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }))
    : []

// 원본·결과물이 그대로면 다시 만들지 않는다.
async function render(srcPath, outPath, pipeline) {
  const { mtimeMs, size } = statSync(srcPath)
  const key = relative(OUT_DIR, outPath).replaceAll('\\', '/')
  const stamp = `${relative(ROOT, srcPath)}|${mtimeMs}|${size}`
  newCache[key] = stamp
  if (oldCache[key] === stamp && existsSync(outPath)) return { skipped: true }
  mkdirSync(join(outPath, '..'), { recursive: true })
  const info = await pipeline(sharp(srcPath).rotate()).jpeg(JPEG).toFile(outPath)
  return { skipped: false, info }
}

function explainError(file, err) {
  const heic = /\.(heic|heif)$/i.test(file)
  console.warn(
    `[photos] ${file} 을(를) 처리하지 못해 건너뜁니다.` +
      (heic ? ' 아이폰 HEIC 사진은 JPG로 변환해서 넣어주세요.' : ` (${err.message})`),
  )
}

let made = 0
let skipped = 0

// ---------- 커버 ----------
const coverFile = listImages(SRC_DIR).find((f) => /^cover\./i.test(f))
let cover = null
if (coverFile) {
  try {
    const r = await render(join(SRC_DIR, coverFile), join(OUT_DIR, 'cover.jpg'), (img) =>
      img.resize({ width: COVER_WIDTH, withoutEnlargement: true }),
    )
    r.skipped ? skipped++ : made++
    cover = 'images/cover.jpg'
  } catch (err) {
    explainError(coverFile, err)
  }
}

// ---------- 갤러리 ----------
const galleryDir = join(SRC_DIR, 'gallery')
const galleryFiles = listImages(galleryDir)
const gallery = []
for (const file of galleryFiles) {
  const n = pad(gallery.length + 1)
  const srcPath = join(galleryDir, file)
  try {
    const full = await render(srcPath, join(OUT_DIR, 'gallery', `${n}.jpg`), (img) =>
      img.resize({ width: FULL_SIZE, height: FULL_SIZE, fit: 'inside', withoutEnlargement: true }),
    )
    const thumb = await render(srcPath, join(OUT_DIR, 'gallery', 'thumbs', `${n}.jpg`), (img) =>
      img.resize({ width: THUMB_SIZE, height: THUMB_SIZE, fit: 'cover', position: sharp.strategy.attention }),
    )
    for (const r of [full, thumb]) r.skipped ? skipped++ : made++
    gallery.push({ src: `images/gallery/${n}.jpg`, thumb: `images/gallery/thumbs/${n}.jpg` })
  } catch (err) {
    explainError(file, err)
  }
}

// 갤러리 사진이 하나라도 처리됐으면, 목록에 없는 예전 파일(자리표시 SVG 포함)은 지운다.
if (gallery.length) {
  const keep = new Set(gallery.flatMap((g) => [g.src, g.thumb]).map((p) => p.replace('images/', '')))
  for (const sub of ['gallery', 'gallery/thumbs']) {
    const dir = join(OUT_DIR, sub)
    if (!existsSync(dir)) continue
    for (const name of readdirSync(dir)) {
      const rel = `${sub}/${name}`
      if (statSync(join(dir, name)).isFile() && !keep.has(rel)) rmSync(join(dir, name))
    }
  }
}

writeFileSync(CACHE, JSON.stringify(newCache, null, 1))

// 처리된 사진이 없으면 기존 목록(자리표시 이미지)을 건드리지 않는다.
if (!cover && !gallery.length) {
  console.log('[photos] photos/ 에 처리할 사진이 없습니다. (cover.jpg, gallery/*.jpg)')
  process.exit(0)
}

const current = await import(`${new URL('../src/config/photos.generated.js', import.meta.url).href}?t=${Date.now()}`)
const manifest = {
  cover: cover ?? current.photos.cover,
  gallery: gallery.length ? gallery : current.photos.gallery,
}
const quote = (v) => (v === null ? 'null' : `'${v}'`)
writeFileSync(
  MANIFEST,
  [
    '// 이 파일은 npm run photos 가 photos/ 폴더를 보고 자동으로 만듭니다. 직접 수정하지 마세요.',
    'export const photos = {',
    `  cover: ${quote(manifest.cover)},`,
    '  gallery: [',
    ...manifest.gallery.map((g) => `    { src: ${quote(g.src)}, thumb: ${quote(g.thumb)} },`),
    '  ],',
    '}',
    '',
  ].join('\n'),
)

const total = gallery.length + (cover ? 1 : 0)
console.log(`[photos] 사진 ${total}장 준비 완료 (새로 만듦 ${made}, 그대로 ${skipped})`)
