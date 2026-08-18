/**
 * Summary panel for a structured report (severity counts, URL, timestamp).
 * Placeholder until /audit returns a processed report instead of raw axe JSON.
 */
export default function ReportSummary({ report }) {
  if (!report) return null

  return (
    <section className="placeholder" aria-label="Report summary">
      Report summary will render here.
    </section>
  )
}
