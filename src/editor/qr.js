// 실물 청첩장에 넣을 QR코드를 만든다.
// QR 섹션이 화면에 나올 때만 불러오는 모듈이라, QR 라이브러리가 다른 화면을 무겁게 하지 않는다.
import QRCode from 'qrcode'

// 인쇄물은 조금 가려지거나 번져도 읽히도록 복원 수준을 높이고(Q), 둘레에 흰 여백 4칸을 둔다.
const OPTIONS = { errorCorrectionLevel: 'Q', margin: 4 }
const PNG_SIZE = 2000

export const qrSvg = (url) => QRCode.toString(url, { ...OPTIONS, type: 'svg' })

export async function qrPng(url, { transparent = false } = {}) {
  const dataUrl = await QRCode.toDataURL(url, {
    ...OPTIONS,
    width: PNG_SIZE,
    color: { dark: '#000000', light: transparent ? '#ffffff00' : '#ffffff' },
  })
  return (await fetch(dataUrl)).blob()
}
