import { useState } from 'react'
import { wedding } from '../config/wedding.js'
import { asset } from '../lib/asset.js'
import Section from './Section.jsx'
import Reveal from './Reveal.jsx'
import Lightbox from './Lightbox.jsx'
import './Gallery.css'

const INITIAL_COUNT = 9

export default function Gallery() {
  const images = wedding.gallery.map(asset)
  const [expanded, setExpanded] = useState(false)
  const [openIndex, setOpenIndex] = useState(null)

  if (images.length === 0) return null
  const visible = expanded ? images : images.slice(0, INITIAL_COUNT)

  return (
    <Section id="gallery" eyebrow="Gallery" title="우리의 순간">
      <Reveal className="gallery__grid">
        {visible.map((src, i) => (
          <button
            key={src}
            type="button"
            className="gallery__item"
            onClick={() => setOpenIndex(i)}
            aria-label={`사진 ${i + 1} 크게 보기`}
          >
            <img src={src} alt="" loading="lazy" />
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
