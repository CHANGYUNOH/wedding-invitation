import { useState } from 'react'
import { wedding } from '../config/wedding.js'
import { copyText } from '../lib/clipboard.js'
import Section from './Section.jsx'
import Reveal from './Reveal.jsx'
import { toast } from './Toast.jsx'
import './Account.css'

function AccountGroup({ label, side, items }) {
  const [open, setOpen] = useState(false)
  const panelId = `account-${side}`

  const copy = async ({ bank, number, name }) => {
    const ok = await copyText(`${bank} ${number} ${name}`)
    toast(ok ? '계좌번호가 복사되었습니다.' : '복사하지 못했습니다. 계좌번호를 길게 눌러 복사해주세요.')
  }

  return (
    <div className={`account account--${side}${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="account__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <div id={panelId} className="account__panel" inert={!open}>
        <ul className="account__list">
          {items.map((item) => (
            <li key={`${item.role}-${item.number}`} className="account__item">
              <div className="account__info">
                <p className="account__owner">
                  <span>{item.role}</span> {item.name}
                </p>
                <p className="account__number">
                  {item.bank} {item.number}
                </p>
              </div>
              <div className="account__actions">
                <button type="button" className="btn-small" onClick={() => copy(item)}>
                  복사
                </button>
                {item.kakaopay && (
                  <a className="btn-small account__kakaopay" href={item.kakaopay} target="_blank" rel="noreferrer">
                    카카오페이
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function Account() {
  const { accounts } = wedding

  return (
    <Section id="account" eyebrow="Account" title="마음 전하실 곳" soft>
      <Reveal>
        <p className="section__desc">
          참석이 어려우신 분들을 위해
          <br />
          계좌번호를 기재하였습니다.
          <br />
          너그러운 마음으로 양해 부탁드립니다.
        </p>
      </Reveal>
      <Reveal className="account__groups">
        <AccountGroup label="신랑측 계좌번호" side="groom" items={accounts.groom} />
        <AccountGroup label="신부측 계좌번호" side="bride" items={accounts.bride} />
      </Reveal>
    </Section>
  )
}
