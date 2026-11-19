import { useEffect, useState } from 'react'
import { toast } from '../components/Toast.jsx'
import { saveFile } from './saveFile.js'

const FORMATS = [
  { id: 'png', label: 'PNG', sub: '흰 배경', file: 'wedding-qr.png' },
  { id: 'transparent', label: 'PNG', sub: '투명 배경', file: 'wedding-qr-transparent.png' },
  { id: 'svg', label: 'SVG', sub: '인쇄소 전달용', file: 'wedding-qr.svg' },
]

// 주소를 표준 형태로 맞춘다 ('https://example.com' → 'https://example.com/'). 웹 주소가 아니면 빈 문자열.
export const normalizeUrl = (value) => {
  try {
    const url = new URL(value.trim())
    return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

// 실물 청첩장에 넣을 QR코드: 청첩장 주소로 바로 만들어 보여주고 이미지로 내려받는다.
export default function QrDownload({ url }) {
  const target = normalizeUrl(url)
  const valid = Boolean(target)
  const [svg, setSvg] = useState('')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    setSvg('')
    if (!valid) return
    let stale = false
    import('./qr.js')
      .then(({ qrSvg }) => qrSvg(target))
      .then((markup) => !stale && setSvg(markup))
      .catch((err) => console.error(err))
    return () => {
      stale = true
    }
  }, [target, valid])

  const download = async ({ id, file }) => {
    setBusy(id)
    try {
      const { qrSvg, qrPng } = await import('./qr.js')
      const blob =
        id === 'svg'
          ? new Blob([await qrSvg(target)], { type: 'image/svg+xml' })
          : await qrPng(target, { transparent: id === 'transparent' })
      saveFile(blob, file)
      toast('QR코드를 내려받았어요.')
    } catch (err) {
      console.error(err)
      toast('QR코드를 만들지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setBusy('')
    }
  }

  if (!valid) {
    return <p className="ed-qr__empty">위에 청첩장 주소(https://…)를 입력하면 QR코드가 만들어져요.</p>
  }

  return (
    <div className="ed-qr">
      <div className="ed-qr__code">
        {svg && <img src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} alt="청첩장 주소 QR코드" />}
      </div>
      <div className="ed-qr__side">
        <p className="ed-qr__url">{target}</p>
        <div className="ed-qr__buttons">
          {FORMATS.map((f) => (
            <button key={f.id} type="button" className="ed-btn ed-qr__btn" disabled={Boolean(busy)} onClick={() => download(f)}>
              <strong>{busy === f.id ? '만드는 중…' : f.label}</strong>
              <small>{f.sub}</small>
            </button>
          ))}
        </div>
        <ul className="ed-qr__tips">
          <li>가로세로 2cm 이상, 둘레 흰 여백은 자르지 말고 넣어주세요.</li>
          <li>인쇄한 뒤에는 주소를 바꿀 수 없으니, 인쇄 전에 휴대폰으로 찍어 확인하세요.</li>
        </ul>
      </div>
    </div>
  )
}
