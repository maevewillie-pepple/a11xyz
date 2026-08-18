export default function UrlForm({ className = '', style, disabled, url, onUrlChange, onSubmit }) {
  function handleSubmit(event) {
    event.preventDefault()
    if (disabled) return
    const trimmed = url.trim()
    if (!trimmed) return
    onSubmit(trimmed)
  }

  return (
    <form className={className} style={style} onSubmit={handleSubmit}>
      <input
        type="text"
        inputMode="url"
        autoComplete="url"
        spellCheck="false"
        placeholder="yourwebsite.com"
        aria-label="Website URL to audit"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        disabled={disabled}
        required
      />
      <button type="submit" disabled={disabled} aria-busy={disabled}>
        {disabled ? 'Auditing…' : 'Audit'}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </form>
  )
}
