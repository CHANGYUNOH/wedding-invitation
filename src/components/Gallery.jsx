import { useState } from 'react'
import { useWedding } from '../lib/wedding-context.jsx'
import { asset } from '../lib/asset.js'
import Section from './Section.jsx'
import Reveal from './Reveal.jsx'
import Lightbox from './Lightbox.jsx'
import './Gallery.css'

const INITIAL_COUNT = 9

export default function Gallery() {
  // 목록에는 'images/a.jpg' 같은 경로나 { src, thumb } 객체(npm run photos 결과)가 올 수 있다.
  const photos = useWedding().gallery.map((p) => (typeof p === 'string' ? { src: p, thumb: p } : p))
  const images = photos.map((p) => asset(p.src))
  const [expanded, setExpanded] = useState(false)
  const [openIndex, setOpenIndex] = useState(null)

  if (images.length === 0) return null
  const visible = expanded ? photos : photos.slice(0, INITIAL_COUNT)

  return (
    <Section id="gallery" eyebrow="Gallery" title="우리의 순간">
      <Reveal className="gallery__grid">
        {visible.map((photo, i) => (
          <button
            key={photo.src}
            type="button"
            className="gallery__item"
            onClick={() => setOpenIndex(i)}
            aria-label={`사진 ${i + 1} 크게 보기`}
          >
            <img src={asset(photo.thumb)} alt="" loading="lazy" decoding="async" />
          </button>
        ))}
      </Reveal>

      {images.length > INITIAL_COUNT && (
        <button type="button" className="btn gallery__more" onClick={() => setExpanded((v) => !v)}>
          {expanded ? '접기' : `사진 더보기 (${images.length - INITIAL_COUNT})`}
        </button>
      )}

      <Lightbox images={images} index={openIndex} onChange={setOpenIndex} onClose={() => setOpenIndex(null)} />
    </Section>
  )
}
