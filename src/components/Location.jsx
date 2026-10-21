import { useCallback, useEffect, useRef, useState } from 'react'
import { useWedding } from '../lib/wedding-context.jsx'
import { hasKakaoKey, getKakaoMaps } from '../lib/kakao.js'
import { copyText } from '../lib/clipboard.js'
import Section from './Section.jsx'
import Reveal from './Reveal.jsx'
import { toast } from './Toast.jsx'
import './Location.css'

function KakaoMap({ venue, onFail }) {
  const ref = useRef(null)

  useEffect(() => {
    let cancelled = false
    getKakaoMaps()
      .then((maps) => {
        if (cancelled) return
        const position = new maps.LatLng(venue.lat, venue.lng)
        const map = new maps.Map(ref.current, { center: position, level: 3 })
        // 지도 위에서 페이지 스크롤이 막히지 않도록 이동·확대를 끈다. 길찾기는 아래 버튼으로 안내한다.
        map.setDraggable(false)
        map.setZoomable(false)
        new maps.Marker({ position, map })
      })
      .catch((err) => {
        console.warn('[wedding] 카카오맵을 불러오지 못해 기본 지도로 대체합니다.', err)
        if (!cancelled) onFail()
      })
    return () => {
      cancelled = true
    }
  }, [venue.lat, venue.lng, onFail])

  return <div ref={ref} className="location__map" />
}

// 카카오 키가 없을 때 쓰는 대체 지도 (OpenStreetMap)
function FallbackMap({ venue }) {
  const d = 0.004
  const bbox = [venue.lng - d, venue.lat - d * 0.7, venue.lng + d, venue.lat + d * 0.7].join(',')
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${venue.lat},${venue.lng}`
  return (
    <div className="location__map">
      <iframe title={`${venue.name} 지도`} src={src} loading="lazy" />
    </div>
  )
}

const navLinks = (venue) => [
  {
    label: '네이버지도',
    href: venue.naverMapUrl || `https://map.naver.com/p/search/${encodeURIComponent(venue.name)}`,
  },
  {
    label: '카카오맵',
    href: `https://map.kakao.com/link/to/${encodeURIComponent(venue.name)},${venue.lat},${venue.lng}`,
  },
  {
    label: '티맵',
    href: `tmap://route?goalname=${encodeURIComponent(venue.name)}&goalx=${venue.lng}&goaly=${venue.lat}`,
  },
]

export default function Location() {
  const { venue } = useWedding()
  const [useKakao, setUseKakao] = useState(hasKakaoKey)
  const disableKakao = useCallback(() => setUseKakao(false), [])

  const copyAddress = async () => {
    const ok = await copyText(venue.address)
    toast(ok ? '주소가 복사되었습니다.' : '복사하지 못했습니다. 주소를 길게 눌러 복사해주세요.')
  }

  return (
    <Section id="location" eyebrow="Location" title="오시는 길" soft>
      <Reveal className="location__venue">
        <p className="location__name">
          {venue.name} <span>{venue.hall}</span>
        </p>
        <p className="location__address">
          {venue.address}
          <button type="button" className="btn-small" onClick={copyAddress}>
            복사
          </button>
        </p>
        {venue.tel && (
          <a className="location__tel" href={`tel:${venue.tel.replace(/[^0-9+]/g, '')}`}>
            Tel. {venue.tel}
          </a>
        )}
      </Reveal>

      <Reveal>
        {useKakao ? <KakaoMap venue={venue} onFail={disableKakao} /> : <FallbackMap venue={venue} />}
        <div className="location__nav">
          {navLinks(venue).map((link) => (
            <a key={link.label} className="location__nav-link" href={link.href} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          ))}
        </div>
      </Reveal>

      <Reveal className="location__transport">
        {venue.transport.map((item) => (
          <div key={item.title} className="location__transport-item">
            <h3>{item.title}</h3>
            {item.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ))}
      </Reveal>
    </Section>
  )
}
