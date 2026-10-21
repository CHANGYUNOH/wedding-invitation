import { useWedding } from '../lib/wedding-context.jsx'
import { orderedHosts, parentName } from '../lib/hosts.js'
import Section from './Section.jsx'
import Reveal from './Reveal.jsx'
import './Greeting.css'

function ParentLine({ person }) {
  return (
    <p className="greeting__family">
      <span className="greeting__parents">
        {parentName(person.father, person.fatherDeceased)}
        <span className="greeting__dot">·</span>
        {parentName(person.mother, person.motherDeceased)}
      </span>
      <span className="greeting__relation">의 {person.relation}</span>
      <strong className="greeting__child">{person.shortName}</strong>
    </p>
  )
}

export default function Greeting() {
  const wedding = useWedding()
  const { greeting } = wedding

  return (
    <Section id="greeting" eyebrow="Invitation" title={greeting.title}>
      <Reveal className="greeting__message">
        {greeting.message.map((line, i) => (line ? <p key={i}>{line}</p> : <br key={i} />))}
      </Reveal>

      <Reveal className="greeting__divider" />

      <Reveal className="greeting__families">
        {orderedHosts(wedding).map((person) => (
          <ParentLine key={person.side} person={person} />
        ))}
      </Reveal>
    </Section>
  )
}
