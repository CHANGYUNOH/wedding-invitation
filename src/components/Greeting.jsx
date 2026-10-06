import { wedding } from '../config/wedding.js'
import Section from './Section.jsx'
import Reveal from './Reveal.jsx'
import './Greeting.css'

function ParentLine({ person }) {
  return (
    <p className="greeting__family">
      <span className="greeting__parents">
        {person.father}
        <span className="greeting__dot">·</span>
        {person.mother}
      </span>
      <span className="greeting__relation">의 {person.relation}</span>
      <strong className="greeting__child">{person.shortName}</strong>
    </p>
  )
}

export default function Greeting() {
  const { greeting, groom, bride } = wedding

  return (
    <Section id="greeting" eyebrow="Invitation" title={greeting.title}>
      <Reveal className="greeting__message">
        {greeting.message.map((line, i) => (line ? <p key={i}>{line}</p> : <br key={i} />))}
      </Reveal>

      <Reveal className="greeting__divider" />

      <Reveal className="greeting__families">
        <ParentLine person={groom} />
        <ParentLine person={bride} />
      </Reveal>
    </Section>
  )
}
