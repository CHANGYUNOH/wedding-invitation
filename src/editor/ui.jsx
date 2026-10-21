export function Section({ id, emoji, title, desc, done, optional, children }) {
  return (
    <section className="ed-section" id={`sec-${id}`}>
      <header className="ed-section__head">
        <h2 className="ed-section__title">
          <span className="ed-section__emoji" aria-hidden="true">
            {emoji}
          </span>
          {title}
          {done && <span className="ed-badge ed-badge--done">완료</span>}
          {!done && optional && <span className="ed-badge">선택</span>}
        </h2>
        {desc && <p className="ed-section__desc">{desc}</p>}
      </header>
      <div className="ed-section__body">{children}</div>
    </section>
  )
}

// 섹션 사이를 잇는 점선 (진행 흐름 표시)
export function Connector() {
  return (
    <div className="ed-connector" aria-hidden="true">
      <span />
      <i />
      <i />
      <i />
      <span />
    </div>
  )
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <div className={`ed-field ${className}`}>
      {label && <div className="ed-field__label">{label}</div>}
      {children}
      {hint && <p className="ed-field__hint">{hint}</p>}
    </div>
  )
}

export function Row({ children }) {
  return <div className="ed-row">{children}</div>
}

export function TextInput({ value, onChange, label, list, ...rest }) {
  return (
    <input
      className="ed-input"
      value={value ?? ''}
      aria-label={label}
      list={list}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    />
  )
}

export function TextArea({ value, onChange, label, ...rest }) {
  return (
    <textarea className="ed-input ed-textarea" value={value} aria-label={label} onChange={(e) => onChange(e.target.value)} {...rest} />
  )
}

export function Check({ checked, onChange, children }) {
  return (
    <label className="ed-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  )
}

export function Datalist({ id, options }) {
  return (
    <datalist id={id}>
      {options.map((o) => (
        <option key={o} value={o} />
      ))}
    </datalist>
  )
}

export function IconButton({ label, onClick, children, className = '' }) {
  return (
    <button type="button" className={`ed-icon-btn ${className}`} aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  )
}

export const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

export const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)
