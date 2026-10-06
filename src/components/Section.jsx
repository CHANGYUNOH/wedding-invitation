import Reveal from './Reveal.jsx'

export default function Section({ id, eyebrow, title, soft = false, children }) {
  return (
    <section id={id} className={`section${soft ? ' section--soft' : ''}`}>
      <Reveal>
        {eyebrow && <p className="section__eyebrow">{eyebrow}</p>}
        {title && <h2 className="section__title">{title}</h2>}
      </Reveal>
      {children}
    </section>
  )
}
