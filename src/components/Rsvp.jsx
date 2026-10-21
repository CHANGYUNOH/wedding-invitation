import { useState } from 'react'
import { submitRsvp } from '../lib/api.js'
import { useWedding, usePreview } from '../lib/wedding-context.jsx'
import { orderedHosts } from '../lib/hosts.js'
import Section from './Section.jsx'
import Reveal from './Reveal.jsx'
import Modal from './Modal.jsx'
import { toast } from './Toast.jsx'
import './Rsvp.css'

const MAX_HEADCOUNT = 10

function Segmented({ name, value, options, onChange }) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((opt) => (
        <label key={String(opt.value)} className="segmented__option">
          <input
            type="radio"
            name={name}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
          />
          <span>{opt.label}</span>
        </label>
      ))}
    </div>
  )
}

function RsvpForm({ onDone }) {
  const hosts = orderedHosts(useWedding())
  const preview = usePreview()
  const [form, setForm] = useState({ side: hosts[0].side, attending: true, name: '', headcount: 1, meal: 'yes' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('성함을 입력해주세요.')
      return
    }
    if (preview) {
      toast('미리보기에서는 전송되지 않아요.')
      onDone()
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await submitRsvp(form.attending ? form : { ...form, headcount: 0, meal: 'no' })
      toast('참석 의사가 전달되었습니다. 감사합니다.')
      onDone()
    } catch (err) {
      console.error(err)
      setError('전송에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="field">
        <span className="field__label">어느 측 하객이신가요?</span>
        <Segmented
          name="side"
          value={form.side}
          onChange={set('side')}
          options={hosts.map(({ side, label }) => ({ value: side, label: `${label}측` }))}
        />
      </div>

      <div className="field">
        <span className="field__label">참석 여부</span>
        <Segmented
          name="attending"
          value={form.attending}
          onChange={set('attending')}
          options={[
            { value: true, label: '참석할게요' },
            { value: false, label: '참석이 어려워요' },
          ]}
        />
      </div>

      <label className="field">
        <span className="field__label">성함</span>
        <input
          className="input"
          value={form.name}
          maxLength={30}
          autoComplete="name"
          placeholder="성함을 입력해주세요"
          onChange={(e) => set('name')(e.target.value)}
        />
      </label>

      {form.attending && (
        <>
          <div className="field">
            <span className="field__label">본인 포함 참석 인원</span>
            <div className="stepper">
              <button
                type="button"
                aria-label="인원 줄이기"
                disabled={form.headcount <= 1}
                onClick={() => set('headcount')(form.headcount - 1)}
              >
                −
              </button>
              <output aria-live="polite">{form.headcount}명</output>
              <button
                type="button"
                aria-label="인원 늘리기"
                disabled={form.headcount >= MAX_HEADCOUNT}
                onClick={() => set('headcount')(form.headcount + 1)}
              >
                +
              </button>
            </div>
          </div>

          <div className="field">
            <span className="field__label">식사 여부</span>
            <Segmented
              name="meal"
              value={form.meal}
              onChange={set('meal')}
              options={[
                { value: 'yes', label: '예정' },
                { value: 'no', label: '안 함' },
                { value: 'undecided', label: '미정' },
              ]}
            />
          </div>
        </>
      )}

      {error && <p className="form-error">{error}</p>}

      <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
        {submitting ? '전송 중…' : '전달하기'}
      </button>
    </form>
  )
}

export default function Rsvp() {
  const [open, setOpen] = useState(false)

  return (
    <Section id="rsvp" eyebrow="R.S.V.P." title="참석 의사 전달">
      <Reveal>
        <p className="section__desc">
          축하의 마음으로 참석해주시는 모든 분들을
          <br />
          귀하게 모실 수 있도록
          <br />
          참석 의사를 전달 부탁드립니다.
        </p>
        <button type="button" className="btn btn--primary rsvp__open" onClick={() => setOpen(true)}>
          참석 의사 전달하기
        </button>
      </Reveal>

      <Modal open={open} onClose={() => setOpen(false)} title="참석 의사 전달">
        <RsvpForm onDone={() => setOpen(false)} />
      </Modal>
    </Section>
  )
}
