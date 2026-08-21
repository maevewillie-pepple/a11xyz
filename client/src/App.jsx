import { useEffect, useState } from 'react'
import posthog from 'posthog-js'
import Landing from './components/Landing.jsx'
import ReportSummary from './components/ReportSummary.jsx'
import IssueCard from './components/IssueCard.jsx'

const analyticsEnabled = Boolean(import.meta.env.VITE_POSTHOG_KEY && import.meta.env.VITE_POSTHOG_HOST)

function captureAuditEvent(event, properties) {
  if (analyticsEnabled) posthog.capture(event, properties)
}

function normalizeAuditUrl(value) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  let parsed
  try {
    parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/\//, '')}`)
  } catch {
    return ''
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
  const host = parsed.hostname
  if (
    host &&
    host !== 'localhost' &&
    host.includes('.') &&
    !host.toLowerCase().startsWith('www.') &&
    !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)
  ) {
    const parts = host.split('.')
    const isApex = parts.length === 2 || (parts.length === 3 && /^(co|com|org|net|gov|ac|edu)$/i.test(parts[1]))
    if (isApex) parsed.hostname = `www.${host}`
  }
  return parsed.href
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
    captureAuditEvent('audit_requested')

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
      const violationCount = Array.isArray(data.violations) ? data.violations.length : 0
      const passCount = Array.isArray(data.passes) ? data.passes.length : 0
      captureAuditEvent('audit_completed', { violation_count: violationCount, pass_count: passCount })
      setRaw(data)
      setStatus('done')
    } catch (err) {
      captureAuditEvent('audit_failed', {
        failure_type: err instanceof TypeError ? 'network' : 'request',
      })
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
