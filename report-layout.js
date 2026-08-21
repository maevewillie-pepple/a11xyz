import { escapeCssUrl, escapeHtml, severityLabel } from './report-model.js';

function countNoun(n, one, many) {
  return n === 1 ? one : many;
}

function SeverityIcon(severity) {
  if (severity === 'crit') {
    return '<svg class="sev-glyph" viewBox="0 0 12 12" aria-hidden="true"><rect x="1" y="1" width="10" height="10"/></svg>';
  }
  if (severity === 'serious') {
    return '<svg class="sev-glyph" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.2 11 6 6 10.8 1 6Z"/></svg>';
  }
  if (severity === 'moderate') {
    return '<svg class="sev-glyph" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.4"/></svg>';
  }
  return '<svg class="sev-glyph sev-glyph-outline" viewBox="0 0 12 12" aria-hidden="true"><rect x="1.6" y="1.6" width="8.8" height="8.8" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
}

export function ReportHeader(doc) {
  return `<header class="report-head">
    <div class="report-brand">
      <span class="report-logo-mark" aria-hidden="true"></span>
      <span>A11xyz</span>
    </div>
    <p class="report-kind">${escapeHtml(doc.kind)}</p>
    <h1>Accessibility Report</h1>
    <dl class="report-meta">
      <div>
        <dt>Scanned URL</dt>
        <dd class="mono">${escapeHtml(doc.url || doc.host || 'Unknown page')}</dd>
      </div>
      <div>
        <dt>Date scanned</dt>
        <dd>${escapeHtml(doc.scannedAtLabel || '')}</dd>
      </div>
      <div>
        <dt>Standard tested against</dt>
        <dd><strong>WCAG 2.2 AA</strong></dd>
      </div>
    </dl>
  </header>`;
}

export function Summary(doc) {
  const count = doc.issueCount;
  const heading = count === 1 ? '1 issue detected' : `${count} issues detected`;
  return `<section class="report-summary" aria-labelledby="report-count">
    <h2 id="report-count">${escapeHtml(heading)}</h2>
    ${SeverityBreakdown(doc)}
    <div class="report-meaning">
      <h3>What this means</h3>
      <p>${escapeHtml(doc.meaning)}</p>
    </div>
  </section>`;
}

export function SeverityBreakdown(doc) {
  const items = ['crit', 'serious', 'moderate', 'minor']
    .map((key) => {
      const n = Number(doc.summary?.[key]) || 0;
      return `<li class="sev-card sev-${key}">
        ${SeverityIcon(key)}
        <span class="sev-count">${n}</span>
        <span class="sev-label">${escapeHtml(severityLabel(key))}</span>
      </li>`;
    })
    .join('');
  return `<ul class="sev-grid">${items}</ul>`;
}

function markerList(markers) {
  return (markers || [])
    .map(
      (marker) =>
        `<li class="report-marker sev-${escapeHtml(marker.severity)}" style="left:${marker.xPct.toFixed(2)}%;top:${marker.yPct.toFixed(2)}%;"><span class="report-marker-shape" aria-hidden="true">${SeverityIcon(marker.severity)}</span><span class="report-marker-id">${escapeHtml(marker.label)}</span></li>`,
    )
    .join('');
}

export function AnnotatedScreenshot(doc) {
  if (!doc.screenshot) return '';
  const panels = (doc.panels || [])
    .map((panel) => {
      const caption =
        panel.panelCount > 1
          ? `Page section ${panel.panelIndex} of ${panel.panelCount}`
          : 'Scanned page';
      const alt = `Screenshot of ${doc.url || 'the scanned page'}${panel.panelCount > 1 ? `, section ${panel.panelIndex} of ${panel.panelCount}` : ''}${doc.issueCount ? ', with numbered markers for the findings in this report' : ''}.`;
      return `<figure class="shot-panel">
        <div class="shot-frame">
          <div class="shot-clip shot-bitmap" role="img" aria-label="${escapeHtml(alt)}" style="aspect-ratio:${panel.aspect};background-size:${panel.size};background-position:${panel.position};"></div>
          <ol class="report-markers" aria-hidden="true">${markerList(panel.markers)}</ol>
        </div>
        <figcaption>${escapeHtml(caption)}</figcaption>
      </figure>`;
    })
    .join('');

  return `<section class="report-overview" aria-labelledby="overview-title">
    <h2 id="overview-title">Issues on the page</h2>
    <p class="section-lead">${doc.issueCount ? 'Numbered markers match the findings later in this report.' : 'A screenshot of the page as scanned. No automated issues were flagged.'}</p>
    ${panels}
  </section>`;
}

export function PriorityFinding(item) {
  const n = item.locationCount;
  const wcag = item.wcag
    ? `WCAG ${escapeHtml(item.wcag)}${item.wcagName ? ` · ${escapeHtml(item.wcagName)}` : ''}`
    : '';
  return `<article class="priority-item">
    <p class="priority-kicker">${SeverityIcon(item.severity)} <span>${escapeHtml(severityLabel(item.severity))} · ${escapeHtml(item.numberLabel)}</span></p>
    <h3>${escapeHtml(item.title)}</h3>
    <p class="priority-meta"><strong>${n} ${escapeHtml(countNoun(n, 'instance', 'instances'))}</strong>${wcag ? ` · ${wcag}` : ''}</p>
    <p>${escapeHtml(item.why)}</p>
    ${item.fixText ? `<p class="priority-action"><span>Recommended action →</span> ${escapeHtml(item.fixText)}</p>` : ''}
  </article>`;
}

export function PriorityFindings(doc) {
  if (!doc.priority?.length) return '';
  return `<section class="report-priority" aria-labelledby="priority-title">
    <h2 id="priority-title">What to fix first</h2>
    <p class="section-lead">The highest-priority findings from this scan, so the biggest problems are visible without reading every detail.</p>
    <div class="priority-list">${doc.priority.map(PriorityFinding).join('')}</div>
  </section>`;
}

export function CodeExample({ avoid, better } = {}) {
  if (!avoid && !better) return '';
  const single = !(avoid && better);
  return `<div class="code-example${single ? ' single' : ''}">
    ${avoid ? `<div><p class="code-label">Avoid</p><pre><code>${escapeHtml(avoid)}</code></pre></div>` : ''}
    ${better ? `<div><p class="code-label">Better</p><pre><code>${escapeHtml(better)}</code></pre></div>` : ''}
  </div>`;
}

export function ScreenshotCrop(crop, severity) {
  const highlight = crop.highlight || { left: 0, top: 0, width: 0, height: 0 };
  const markerLeft = highlight.left + Math.max(highlight.width, 4) / 2;
  const markerTop = Math.max(0, highlight.top);
  const markerTransform = markerTop < 10 ? 'translate(-50%, 12%)' : 'translate(-50%, -120%)';
  return `<figure class="crop">
    <div class="crop-frame">
      <div class="shot-bitmap crop-bitmap" role="img" aria-label="Cropped screenshot showing issue ${escapeHtml(crop.label)} on the page." style="aspect-ratio:${crop.style.aspect};background-size:${crop.style.size};background-position:${crop.style.position};"></div>
      <span class="crop-highlight sev-${escapeHtml(severity)}" style="left:${highlight.left.toFixed(2)}%;top:${highlight.top.toFixed(2)}%;width:${Math.max(highlight.width, 1.5).toFixed(2)}%;height:${Math.max(highlight.height, 2).toFixed(2)}%;"></span>
      <span class="report-marker crop-marker sev-${escapeHtml(severity)}" style="left:${markerLeft.toFixed(2)}%;top:${markerTop.toFixed(2)}%;transform:${markerTransform};" aria-hidden="true"><span class="report-marker-shape">${SeverityIcon(severity)}</span><span class="report-marker-id">${escapeHtml(crop.label)}</span></span>
    </div>
    <figcaption>
      <span class="mono">${escapeHtml(crop.label)}</span>
      ${crop.selector ? `<span class="crop-sel mono">${escapeHtml(crop.selector)}</span>` : ''}
    </figcaption>
  </figure>`;
}

function locationMeta(item) {
  const shown = item.locations || item.allLocations || [];
  const labels = (item.allLocations || shown).map((loc) => loc.label).join(' · ');
  const extras = [];
  const first = shown.find((loc) => loc.selector) || shown[0];
  if (first?.selector) extras.push(`<p class="tech-line"><span>Selector</span> <code class="mono">${escapeHtml(first.selector)}</code></p>`);
  if (first?.html) extras.push(`<p class="tech-line"><span>HTML</span> <code class="mono">${escapeHtml(first.html)}</code></p>`);
  return { labels, extras: extras.join('') };
}

export function Finding(item) {
  const n = item.locationCount;
  const wcag = item.wcag
    ? `<p class="finding-wcag">WCAG ${escapeHtml(item.wcag)}${item.wcagName ? ` · ${escapeHtml(item.wcagName)}` : ''}</p>`
    : '';
  const { labels, extras } = locationMeta(item);
  const crops = (item.crops || []).map((crop) => ScreenshotCrop(crop, item.severity)).join('');
  const roles =
    item.design && item.development
      ? `<div class="role-split">
          <div>
            <h4>Design</h4>
            <p>${escapeHtml(item.design)}</p>
          </div>
          <div>
            <h4>Development</h4>
            <p>${escapeHtml(item.development)}</p>
          </div>
        </div>`
      : '';

  return `<article class="finding">
    <header class="finding-head">
      <p class="finding-id">${escapeHtml(item.numberLabel)}</p>
      <p class="finding-sev sev-${escapeHtml(item.severity)}">${SeverityIcon(item.severity)} <span>${escapeHtml(severityLabel(item.severity))}</span></p>
      <h3>${escapeHtml(item.title)}</h3>
      ${wcag}
      <p class="finding-count"><strong>Found in ${n} ${escapeHtml(countNoun(n, 'location', 'locations'))}</strong></p>
      ${n > 1 ? `<p class="finding-labels mono">${escapeHtml(labels)}</p>` : ''}
    </header>
    <div class="finding-block">
      <h4>What's happening?</h4>
      <p>${escapeHtml(item.happening)}</p>
    </div>
    <div class="finding-block">
      <h4>Why it matters</h4>
      <p>${escapeHtml(item.why)}</p>
    </div>
    <div class="finding-block">
      <h4>How to fix it</h4>
      <p>${escapeHtml(item.fixText)}</p>
      ${roles}
      ${CodeExample({ avoid: item.avoidCode, better: item.betterCode })}
    </div>
    <div class="finding-block">
      <h4>Where we found it</h4>
      <p>${n} ${escapeHtml(countNoun(n, 'instance detected', 'instances detected'))}${item.crops.length && n > item.crops.length ? `. Showing ${item.crops.length} useful examples.` : '.'}</p>
      ${crops ? `<div class="crop-grid${item.crops.length === 1 ? ' single' : ''}">${crops}</div>` : '<p>No on-page location was available for this finding.</p>'}
      ${extras ? `<div class="tech-details">${extras}</div>` : ''}
    </div>
  </article>`;
}

export function Findings(doc) {
  if (!doc.issueCount) {
    return `<section class="report-findings" aria-labelledby="findings-title">
      <h2 id="findings-title">Detailed findings</h2>
      <p>A11xyz did not flag any automated violations on this page. Manual testing can still find issues that tools miss.</p>
    </section>`;
  }

  const overflow = doc.overflowIssueCount
    ? `<section class="report-overflow">
        <h3>+${doc.overflowIssueCount} additional ${countNoun(doc.overflowIssueCount, 'issue', 'issues')} detected</h3>
        <p>Shown by type. A fuller report would include every location.</p>
        <ul>${(doc.overflow || [])
          .map(
            (row) =>
              `<li><span>${escapeHtml(row.title)}${row.wcag ? ` · WCAG ${escapeHtml(row.wcag)}` : ''}</span><span>${escapeHtml(severityLabel(row.severity))} · ${row.count}</span></li>`,
          )
          .join('')}</ul>
      </section>`
    : '';

  return `<section class="report-findings" aria-labelledby="findings-title">
    <h2 id="findings-title">Detailed findings</h2>
    ${doc.detailed.map(Finding).join('')}
    ${overflow}
  </section>`;
}

export function Disclaimer(doc) {
  return `<section class="report-about" aria-labelledby="about-title">
    <h2 id="about-title">About this report</h2>
    <p><strong>This is an automated accessibility scan.</strong></p>
    <p>Automated testing cannot detect every accessibility barrier. Manual testing, including keyboard testing, assistive-technology testing and testing with disabled users where appropriate, is recommended.</p>
    <p><strong>This report is not a certification of WCAG compliance.</strong></p>
    <p class="report-next">
      <a href="${escapeHtml(doc.learnUrl)}">Learn how to test manually</a>
      <a href="${escapeHtml(doc.homeUrl)}">Run another scan</a>
    </p>
  </section>`;
}

export function Footer(doc) {
  return `<footer class="report-foot">
    <h2>About A11xyz</h2>
    <p>A11xyz is an automated accessibility scanner. Paste a URL to find WCAG 2.2 AA issues, see them on the page, and get plain-language fixes.</p>
    <p class="mono"><a href="${escapeHtml(doc.homeUrl)}">a11xyz.com</a></p>
  </footer>`;
}

export function reportSheetCss() {
  return `
    .report-sheet{
      width:100%; max-width:178mm; margin:0 auto;
      background:#fff; color:#17160F;
      font-family:'Geist Sans','Geist',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      font-size:11px; line-height:1.5;
      padding:0; box-sizing:border-box;
    }
    .report-sheet *{ box-sizing:border-box; }
    .report-sheet h1,.report-sheet h2,.report-sheet h3,.report-sheet h4{
      font-weight:400; letter-spacing:-0.02em; margin:0; color:#17160F;
    }
    .report-sheet p{ margin:0 0 0.6em; }
    .report-sheet a{ color:#2150C2; text-decoration:underline; text-underline-offset:2px; }
    .mono{ font-family:'Geist Mono','SFMono-Regular',Consolas,monospace; }

    .report-head{ padding-bottom:14px; border-bottom:1px solid #E7E3D9; margin-bottom:18px; break-after:avoid; }
    .report-brand{ display:flex; align-items:center; gap:8px; font-size:15px; margin-bottom:10px; }
    .report-logo-mark{ width:14px; height:14px; border-radius:50%; background:conic-gradient(from 200deg,#2150C2,#12B3A8); flex:0 0 auto; }
    .report-kind{
      display:inline-block; margin:0 0 8px; padding:2px 8px;
      border:1px solid #D8D3C8; border-radius:999px;
      font-size:9.5px; letter-spacing:0.04em; text-transform:uppercase; color:#5E5B52;
    }
    .report-head h1{ font-size:26px; letter-spacing:-0.04em; margin:0 0 12px; }
    .report-meta{ display:grid; grid-template-columns:1.4fr 0.8fr 0.9fr; gap:12px 16px; margin:0; }
    .report-meta div{ min-width:0; }
    .report-meta dt{ font-size:9.5px; color:#5E5B52; margin:0 0 2px; }
    .report-meta dd{ margin:0; word-break:break-word; }
    .report-meta strong{ font-weight:500; }

    .report-summary{ margin:0 0 22px; }
    .report-summary h2{ font-size:28px; letter-spacing:-0.04em; margin:0 0 12px; }
    .sev-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:8px; list-style:none; margin:0 0 14px; padding:0; }
    .sev-card{
      display:flex; flex-direction:column; align-items:flex-start; gap:2px;
      min-width:0; padding:10px 10px 9px; border:1px solid #E7E3D9; border-radius:8px;
      break-inside:avoid;
    }
    .sev-count{ font-size:22px; letter-spacing:-0.03em; line-height:1.1; max-width:100%; overflow-wrap:anywhere; }
    .sev-label{ font-size:10.5px; color:#5E5B52; }
    .sev-glyph{ width:10px; height:10px; display:block; margin-bottom:6px; }
    .sev-crit .sev-glyph{ fill:#C8432A; color:#C8432A; }
    .sev-serious .sev-glyph{ fill:#C87A2A; color:#C87A2A; }
    .sev-moderate .sev-glyph{ fill:#8A7010; color:#8A7010; }
    .sev-minor .sev-glyph{ fill:#5E5B52; color:#5E5B52; }
    .sev-crit{ border-color:#E4C4BC; }
    .sev-serious{ border-color:#E6D0B4; }
    .sev-moderate{ border-color:#DDD4A8; }
    .report-meaning{ padding-top:2px; }
    .report-meaning h3{ font-size:12px; margin:0 0 4px; }
    .report-meaning p{ color:#3F3D36; max-width:62em; }

    .section-lead{ color:#5E5B52; margin:0 0 10px; break-after:avoid; page-break-after:avoid; }
    .report-overview, .report-priority, .report-findings, .report-about{ margin:0 0 22px; }
    .report-overview h2, .report-priority h2, .report-findings h2, .report-about h2, .report-foot h2{
      font-size:20px; letter-spacing:-0.03em; margin:0 0 6px; break-after:avoid; page-break-after:avoid;
    }

    .shot-panel{ margin:0 0 12px; break-inside:avoid; }
    .shot-frame{ position:relative; width:100%; border:1px solid #D8D3C8; background:#EFECE4; overflow:hidden; }
    .shot-clip{ width:100%; background-color:#EFECE4; }
    .shot-panel figcaption, .crop figcaption{ font-size:9.5px; color:#5E5B52; margin-top:4px; }
    .report-markers{ position:absolute; inset:0; margin:0; padding:0; list-style:none; pointer-events:none; }
    .report-marker{
      position:absolute; transform:translate(-50%,-50%);
      display:inline-flex; align-items:center; gap:3px;
      min-height:18px; padding:1px 6px 1px 5px;
      border-radius:999px; border:2px solid transparent;
      background:
        linear-gradient(#17160F,#17160F) padding-box,
        conic-gradient(from 200deg,#2150C2,#12B3A8) border-box;
      color:#FAFAF8;
      box-shadow:0 0 0 1.5px #fff;
      font-family:'Geist Mono','SFMono-Regular',Consolas,monospace;
      font-size:9px; line-height:1; white-space:nowrap;
    }
    .report-marker .sev-glyph{ width:7px; height:7px; margin:0; fill:#FAFAF8; color:#FAFAF8; }
    .report-marker.sev-minor .sev-glyph-outline{ stroke:#FAFAF8; }

    .priority-list{ display:flex; flex-direction:column; gap:0; }
    .priority-item{ padding:12px 0; border-top:1px solid #E7E3D9; break-inside:avoid; page-break-inside:avoid; }
    .priority-item:first-child{ break-before:avoid; page-break-before:avoid; }
    .priority-item:last-child{ border-bottom:1px solid #E7E3D9; }
    .priority-kicker{
      display:flex; align-items:center; gap:6px;
      font-size:10px; letter-spacing:0.06em; text-transform:uppercase; color:#5E5B52; margin:0 0 4px;
    }
    .priority-kicker .sev-glyph{ width:9px; height:9px; margin:0; }
    .priority-item h3{ font-size:15px; margin:0 0 4px; }
    .priority-meta{ color:#5E5B52; font-size:10.5px; }
    .priority-action span{
      display:inline-block; margin-right:6px; letter-spacing:0.04em; text-transform:uppercase;
      font-size:9.5px; color:#2150C2;
    }

    .finding{ padding:16px 0 6px; border-top:1px solid #E7E3D9; }
    .finding-head{ break-after:avoid; margin-bottom:10px; }
    .finding-id{ font-family:'Geist Mono','SFMono-Regular',Consolas,monospace; font-size:12px; margin:0 0 4px; }
    .finding-sev{
      display:inline-flex; align-items:center; gap:6px;
      font-size:10px; letter-spacing:0.06em; text-transform:uppercase; margin:0 0 6px;
    }
    .finding-sev .sev-glyph{ width:9px; height:9px; margin:0; }
    .finding-head h3{ font-size:18px; letter-spacing:-0.03em; margin:0 0 4px; }
    .finding-wcag, .finding-count, .finding-labels{ color:#5E5B52; font-size:10.5px; margin:0 0 3px; }
    .finding-block{ margin:0 0 10px; break-inside:avoid; }
    .finding-block h4{ font-size:12px; margin:0 0 4px; }
    .role-split{ display:grid; grid-template-columns:1fr 1fr; gap:10px 16px; margin:8px 0; }
    .role-split h4{ font-size:11px; }
    .code-example{ display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:8px 0 0; }
    .code-example.single{ grid-template-columns:1fr; }
    .code-label{ font-size:9.5px; letter-spacing:0.04em; text-transform:uppercase; color:#5E5B52; margin:0 0 3px; }
    .code-example pre{
      margin:0; padding:8px; border:1px solid #E7E3D9; background:#FAFAF8;
      white-space:pre-wrap; word-break:break-word; font-size:9.5px; line-height:1.4;
    }
    .crop-grid{ display:grid; grid-template-columns:1fr; gap:12px; margin:8px 0; }
    .crop-grid.single{ grid-template-columns:1fr; }
    .crop{ margin:0; break-inside:avoid; page-break-inside:avoid; }
    .crop-frame{ position:relative; border:1px solid #D8D3C8; background:#EFECE4; overflow:hidden; }
    .crop-bitmap{ width:100%; }
    .crop-highlight{
      position:absolute; border:2px solid #17160F; background:rgba(33,80,194,0.14);
      pointer-events:none;
    }
    .crop-highlight.sev-crit{ border-color:#C8432A; background:rgba(200,67,42,0.16); }
    .crop-highlight.sev-serious{ border-color:#C87A2A; background:rgba(200,122,42,0.16); }
    .crop-highlight.sev-moderate{ border-color:#8A7010; background:rgba(138,112,16,0.16); }
    .crop-marker{ z-index:2; }
    .crop figcaption{ display:flex; flex-direction:column; gap:2px; }
    .crop-sel{ color:#8A8676; word-break:break-all; }
    .tech-details{ margin-top:6px; color:#5E5B52; }
    .tech-line{ font-size:9.5px; margin:0 0 3px; }
    .tech-line span{ display:inline-block; min-width:54px; color:#8A8676; }
    .tech-line code{ font-size:9px; word-break:break-all; }

    .report-overflow{ margin-top:12px; padding-top:12px; border-top:1px solid #E7E3D9; break-inside:avoid; }
    .report-overflow h3{ font-size:14px; margin:0 0 4px; }
    .report-overflow p, .report-overflow li{ color:#5E5B52; }
    .report-overflow ul{ margin:0; padding:0; list-style:none; }
    .report-overflow li{ display:flex; justify-content:space-between; gap:12px; padding:3px 0; border-bottom:1px solid #F1EEE6; }

    .report-about{ padding-top:8px; border-top:1px solid #E7E3D9; break-inside:avoid; }
    .report-next{ display:flex; gap:18px; flex-wrap:wrap; margin-top:10px; }
    .report-foot{ color:#5E5B52; font-size:10.5px; break-inside:avoid; }
    .report-foot h2{ font-size:14px; margin-bottom:4px; }

    @media print{
      .finding{ break-inside:auto; }
      .finding-head, .finding-block, .shot-panel, .priority-item, .sev-grid{ break-inside:avoid; }
    }
  `;
}

export function screenshotBitmapCss(screenshotSrc) {
  if (!screenshotSrc) return '';
  return `.shot-bitmap{background-image:url("${escapeCssUrl(screenshotSrc)}");background-repeat:no-repeat;}`;
}

export function renderReportSheetHtml(doc) {
  return `<article class="report-sheet">
    ${ReportHeader(doc)}
    ${Summary(doc)}
    ${AnnotatedScreenshot(doc)}
    ${PriorityFindings(doc)}
    ${Findings(doc)}
    ${Disclaimer(doc)}
    ${Footer(doc)}
  </article>`;
}
