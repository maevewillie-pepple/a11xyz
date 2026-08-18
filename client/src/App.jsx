import { useEffect, useState } from 'react'
import Landing from './components/Landing.jsx'
import ReportSummary from './components/ReportSummary.jsx'
import IssueCard from './components/IssueCard.jsx'

function normalizeAuditUrl(value) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href
  } catch {
    // fall through and try https://
  }
  try {
    return new URL(`https://${trimmed}`).href
  } catch {
    return ''
  }
}

export default function App() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [raw, setRaw] = useState(null)

  useEffect(() => {
    if (!raw) return
    document.getElementById('report')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [raw])

  async function handleAudit(submitted) {
    const target = normalizeAuditUrl(submitted)
    if (!target) {
      setStatus('error')
      setError('Enter a valid website URL.')
      return
    }

    setUrl(target)
    setStatus('scanning')
    setError('')
    setRaw(null)

    try {
      const res = await fetch('/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.detail || data.error || `Request failed (${res.status})`)
      }
      setRaw(data)
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Audit failed')
    }
  }

  const scanning = status === 'scanning'
  const violationCount = raw?.violations?.length ?? 0
  const statusLine = scanning
    ? 'Scanning… this can take up to a minute.'
    : status === 'error'
      ? error
      : status === 'done'
        ? `Scan complete. ${violationCount} violation${violationCount === 1 ? '' : 's'} found.`
        : ''

  return (
    <Landing
      url={url}
      onUrlChange={setUrl}
      onAudit={handleAudit}
      scanning={scanning}
      statusLine={statusLine}
      statusError={status === 'error'}
    >
      {raw && (
        <section className="raw-report" id="report">
          <h2>Scan result</h2>
          <p className="status" role="status">
            Raw axe-core result: {violationCount} violation
            {violationCount === 1 ? '' : 's'}, {raw.passes?.length ?? 0} passes.
          </p>
          <pre className="raw-panel">{JSON.stringify(raw, null, 2)}</pre>
          <ReportSummary report={null} />
          <IssueCard issue={null} />
        </section>
      )}
    </Landing>
  )
}
