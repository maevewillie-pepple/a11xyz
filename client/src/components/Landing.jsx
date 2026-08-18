import { useEffect } from 'react'
import UrlForm from './UrlForm.jsx'

export default function Landing({ url, onUrlChange, onAudit, scanning, statusLine, statusError, children }) {
  useEffect(() => {
    const header = document.querySelector('header')
    const onScroll = () => {
      header?.classList.toggle('scrolled', window.scrollY > 8)
    }
    document.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    const revealEls = document.querySelectorAll('.reveal')
    let io
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('in')
              io.unobserve(entry.target)
            }
          })
        },
        { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
      )
      revealEls.forEach((el) => io.observe(el))
    } else {
      revealEls.forEach((el) => el.classList.add('in'))
    }

    return () => {
      document.removeEventListener('scroll', onScroll)
      io?.disconnect()
    }
  }, [])

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header>
        <nav className="wrap" aria-label="Primary">
          <a className="logo" href="#main">
            <span className="logo-mark"></span>
            A11xyz
          </a>
          <div className="nav-links">
            <a href="how-it-works.html">How it works</a>
            <a href="what-we-catch.html">What we catch</a>
            <a href="learn.html">Learn</a>
            <a href="faq.html">FAQ</a>
          </div>
          <a className="nav-cta" href="#main">Run a free audit</a>
        </nav>
      </header>

      <main id="main">
        <section className="hero">
          <div className="wrap">
            <span className="eyebrow hero-in"><span className="dot"></span> Automated WCAG 2.2 scanning</span>
            <h1 className="hero-in">See your site the way <span className="u">it&apos;s actually read.</span></h1>
            <p className="sub hero-in">Paste a URL and get an accessibility audit ordered the way a screen reader meets your page, not grouped by rule type. Plain language. Real fixes.</p>

            <UrlForm
              className="audit-form hero-in"
              disabled={scanning}
              url={url}
              onUrlChange={onUrlChange}
              onSubmit={onAudit}
            />
            {statusLine && (
              <p className={`audit-live${statusError ? ' error' : ''}`} role={statusError ? 'alert' : 'status'}>
                {statusLine}
              </p>
            )}
            <p className="hero-note hero-in">Free scan &nbsp;<span className="mono">·</span>&nbsp; No signup &nbsp;<span className="mono">·</span>&nbsp; ~60 seconds</p>

            {children || (
            <div className="signature hero-in" aria-hidden="true">
              <div className="sig-topbar">
                <span></span><span></span><span></span>
                <span className="sig-url mono">yourwebsite.com/checkout</span>
              </div>
              <div className="sig-body">
                <div className="sig-thread"></div>
                <div className="sig-row crit">
                  <div className="sig-badge">1</div>
                  <div className="sig-text">
                    <div className="sig-title">Icon button has no accessible name</div>
                    <div className="sig-meta">Affects screen reader users · header nav</div>
                  </div>
                  <div className="sig-wcag mono">4.1.2</div>
                </div>
                <div className="sig-row serious">
                  <div className="sig-badge">2</div>
                  <div className="sig-text">
                    <div className="sig-title">Text contrast 2.1:1, below AA minimum</div>
                    <div className="sig-meta">Affects low vision users · hero subhead</div>
                  </div>
                  <div className="sig-wcag mono">1.4.3</div>
                </div>
                <div className="sig-row moderate">
                  <div className="sig-badge">3</div>
                  <div className="sig-text">
                    <div className="sig-title">Link text reads &quot;click here&quot;</div>
                    <div className="sig-meta">Affects screen reader users · pricing section</div>
                  </div>
                  <div className="sig-wcag mono">2.4.4</div>
                </div>
                <div className="sig-row minor">
                  <div className="sig-badge">4</div>
                  <div className="sig-text">
                    <div className="sig-title">Email field missing a label</div>
                    <div className="sig-meta">Affects keyboard &amp; screen reader users · footer form</div>
                  </div>
                  <div className="sig-wcag mono">1.3.1</div>
                </div>
              </div>
            </div>
            )}
          </div>
        </section>

        <section className="process" id="how">
          <div className="wrap">
            <div className="section-head reveal">
              <span className="eyebrow-text">How it works</span>
              <h2>Four steps, in order.</h2>
            </div>
            <p style={{ margin: '-36px 0 40px' }}>
              <a href="how-it-works.html" style={{ fontSize: '13.5px', color: 'var(--muted)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>See the full breakdown →</a>
            </p>
            <div className="steps stagger">
              <div className="step reveal">
                <span className="num mono">01</span>
                <h3>Paste a URL</h3>
                <p>Drop in any public page. No account, no plugin, no code to install.</p>
              </div>
              <div className="step reveal">
                <span className="num mono">02</span>
                <h3>We render it</h3>
                <p>A real browser loads the page, including anything built with JavaScript.</p>
              </div>
              <div className="step reveal">
                <span className="num mono">03</span>
                <h3>We scan it</h3>
                <p>Every element is checked against WCAG 2.2, from labels to contrast to focus order.</p>
              </div>
              <div className="step reveal">
                <span className="num mono">04</span>
                <h3>You get the report</h3>
                <p>Issues ordered by reading order, each with why it matters and how to fix it.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="issues" id="issues">
          <div className="wrap">
            <div className="section-head reveal">
              <span className="eyebrow-text">Coverage</span>
              <h2>What we catch.</h2>
            </div>
            <p style={{ margin: '-36px 0 40px' }}>
              <a href="what-we-catch.html" style={{ fontSize: '13.5px', color: 'var(--muted)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>See examples for each →</a>
            </p>
            <div className="issue-grid stagger">
              <div className="issue-card reveal">
                <div className="issue-icon"><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 13c1.2 1.5 2.6 2 4 2s2.8-.5 4-2"/><path d="M9 9h.01M15 9h.01"/></svg></div>
                <h3>Missing ARIA &amp; labels</h3>
                <p>Icon buttons, images and controls with no accessible name for assistive tech.</p>
              </div>
              <div className="issue-card reveal">
                <div className="issue-icon"><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="8" height="18" rx="1"/><rect x="13" y="3" width="8" height="18" rx="1" fill="currentColor" opacity="0.15"/></svg></div>
                <h3>Colour contrast</h3>
                <p>Text and UI elements that fall below AA contrast ratios against their background.</p>
              </div>
              <div className="issue-card reveal">
                <div className="issue-icon"><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7 7l2-2a5 5 0 0 0-7-7"/><path d="M14 11a5 5 0 0 0-7-7L5 6a5 5 0 0 0 7 7"/></svg></div>
                <h3>Vague link text</h3>
                <p>&quot;Click here&quot; and &quot;read more&quot; links that mean nothing out of context.</p>
              </div>
              <div className="issue-card reveal">
                <div className="issue-icon"><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="11" rx="2"/><path d="M7 11h.01M11 11h.01M15 11h.01M8 15h8"/></svg></div>
                <h3>No keyboard support</h3>
                <p>Interactive elements that can&apos;t be reached or operated without a mouse.</p>
              </div>
              <div className="issue-card reveal">
                <div className="issue-icon"><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 10h8M8 14h5"/></svg></div>
                <h3>Unlabelled form fields</h3>
                <p>Inputs with no associated label, so screen reader users can&apos;t tell what to enter.</p>
              </div>
              <div className="issue-card reveal">
                <div className="issue-icon"><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h10M4 18h13"/></svg></div>
                <h3>Heading &amp; structure</h3>
                <p>Skipped heading levels and missing landmarks that break page navigation.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="stats">
          <div className="wrap">
            <div className="stat-row stagger">
              <div className="reveal"><span className="stat-num mono">50+</span><span className="stat-label">WCAG checks run per scan</span></div>
              <div className="reveal"><span className="stat-num mono">~60s</span><span className="stat-label">Average scan time</span></div>
              <div className="reveal"><span className="stat-num mono">2.2</span><span className="stat-label">WCAG standard covered</span></div>
              <div className="reveal"><span className="stat-num mono">0</span><span className="stat-label">Signups required</span></div>
            </div>
          </div>
        </section>

        <section className="asks">
          <div className="wrap">
            <div className="section-head reveal">
              <span className="eyebrow-text">Get in touch</span>
              <h2>Two things we want to hear.</h2>
            </div>
            <div className="ask-grid stagger">
              <a className="ask-card reveal" href="whats-next.html">
                <span className="num mono">01</span>
                <h3>What should we build next?</h3>
                <p>Logged-in pages, whole-site scans, CI, the gap that would make this useful for you. Tell us and it goes on the list.</p>
                <span className="ask-cta">Share an idea <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
              </a>
              <a className="ask-card reveal" href="request-audit.html">
                <span className="num mono">02</span>
                <h3>Do you need an audit?</h3>
                <p>This scan is a first pass, not a full audit. If you need a manual review or advice on what to fix first, we can help.</p>
                <span className="ask-cta">Request an audit <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
              </a>
            </div>
          </div>
        </section>

        <section className="cta reveal" id="get-started">
          <div className="wrap">
            <h2>Paste a URL. See what&apos;s actually wrong.</h2>
            <UrlForm
              className="audit-form"
              style={{ margin: '0 auto' }}
              disabled={scanning}
              url={url}
              onUrlChange={onUrlChange}
              onSubmit={onAudit}
            />
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap foot-row">
          <span>&copy; 2026 Aria</span>
          <a className="mono" href="request-audit.html">Automated scan, not a legal compliance certification</a>
          <a href="mailto:maevepepple@gmail.com">maevepepple@gmail.com</a>
        </div>
      </footer>
    </>
  )
}
