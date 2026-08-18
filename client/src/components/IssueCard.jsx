/**
 * One issue in reading order: screenshot, explanation, WCAG, fix.
 * Placeholder until /audit returns a processed report instead of raw axe JSON.
 */
export default function IssueCard({ issue }) {
  if (!issue) return null

  return (
    <article className="placeholder">
      Issue card will render here.
    </article>
  )
}
