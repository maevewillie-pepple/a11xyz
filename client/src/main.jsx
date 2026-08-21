import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import posthog from 'posthog-js'
import App from './App.jsx'
import './index.css'

const posthogKey = import.meta.env.VITE_POSTHOG_KEY
const posthogHost = import.meta.env.VITE_POSTHOG_HOST

if (!posthogKey) {
  if (import.meta.env.DEV) {
    throw new Error(
      'VITE_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_POSTHOG_KEY is configured',
    )
  }
} else if (!posthogHost) {
  if (import.meta.env.DEV) {
    throw new Error(
      'VITE_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_POSTHOG_HOST is configured',
    )
  }
} else {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    defaults: '2026-05-30',
    capture_pageview: true,
    internal_or_test_user_hostname: null,
    opt_out_useragent_filter: ['localhost', '127.0.0.1'].includes(window.location.hostname),
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
