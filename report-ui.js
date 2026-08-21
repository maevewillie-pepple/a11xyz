import { buildReportDocument, reportFilename } from './report-model.js';
import { renderReportSheetHtml, reportSheetCss, screenshotBitmapCss } from './report-layout.js';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

let scan = null;
let lastFocus = null;
let waitlistFocus = null;
let sheetStyle = null;

function $(id) {
  return document.getElementById(id);
}

function trapFocus(container, event) {
  if (event.key !== 'Tab') return;
  const nodes = [...container.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
  if (!nodes.length) return;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function setPdfStatus(message, isError) {
  const status = $('report-pdf-status');
  if (!status) return;
  status.hidden = !message;
  status.textContent = message || '';
  status.classList.toggle('is-error', Boolean(isError));
}

function track(event, properties) {
  if (!event || typeof window.a11xyzTrack !== 'function') return;
  window.a11xyzTrack(event, properties);
}

function auditRequestHref() {
  const url = scan && scan.url ? String(scan.url).trim() : '';
  if (!url) return 'request-audit.html';
  return 'request-audit.html?url=' + encodeURIComponent(url);
}
function showWaitlistSuccess() {
  const modal = $('waitlist-modal');
  const join = $('waitlist-join');
  const thanks = $('waitlist-thanks');
  join.hidden = true;
  thanks.hidden = false;
  thanks.classList.remove('in');
  void thanks.offsetWidth;
  thanks.classList.add('in');
  modal.setAttribute('aria-labelledby', 'waitlist-success-title');
  $('waitlist-done').focus();
}

function openWaitlist() {
  const modal = $('waitlist-modal');
  waitlistFocus = document.activeElement;
  modal.hidden = false;
  modal.setAttribute('aria-labelledby', 'waitlist-title');
  $('waitlist-error').hidden = true;
  const email = $('waitlist-email');
  email.value = '';
  $('waitlist-name').value = '';
  $('waitlist-join').hidden = false;
  $('waitlist-form').hidden = false;
  const thanks = $('waitlist-thanks');
  thanks.hidden = true;
  thanks.classList.remove('in');
  email.focus();
}

function closeWaitlist() {
  $('waitlist-modal').hidden = true;
  if (waitlistFocus && typeof waitlistFocus.focus === 'function') waitlistFocus.focus();
}

function openReport() {
  if (!scan) return;
  const doc = buildReportDocument(scan, { tier: 'free' });
  const preview = $('report-preview');
  lastFocus = document.activeElement;
  if (sheetStyle) sheetStyle.textContent = reportSheetCss() + screenshotBitmapCss(doc.screenshot);
  $('report-sheet-host').innerHTML = renderReportSheetHtml(doc);
  const auditCta = $('btn-audit-cta');
  if (auditCta) auditCta.href = auditRequestHref();
  preview.hidden = false;
  preview.dataset.filename = reportFilename(doc);
  document.body.classList.add('report-open');
  setPdfStatus('');
  $('btn-report-back').focus();
}

function closeReport() {
  if (!$('waitlist-modal').hidden) {
    closeWaitlist();
    return;
  }
  const preview = $('report-preview');
  if (preview.hidden) return;
  preview.hidden = true;
  document.body.classList.remove('report-open');
  setPdfStatus('');
  if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
}

async function downloadPdf() {
  if (!scan) return;
  const button = $('btn-report-download');
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  setPdfStatus('Preparing your accessibility report…', false);
  try {
    const res = await fetch('/report/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scan }),
    });
    if (!res.ok) throw new Error('pdf');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = $('report-preview').dataset.filename || 'a11xyz-accessibility-report.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setPdfStatus('Your PDF has downloaded.', false);
  } catch {
    setPdfStatus("We couldn't generate your PDF. Your scan results haven't been lost. Please try again.", true);
  } finally {
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
}

async function submitWaitlist(event) {
  event.preventDefault();
  const errorEl = $('waitlist-error');
  errorEl.hidden = true;
  const name = ($('waitlist-name').value || '').trim() || 'Waitlist';
  const email = ($('waitlist-email').value || '').trim();
  const honeypot = ($('waitlist-hp').value || '').trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errorEl.hidden = false;
    errorEl.textContent = 'Enter a valid email address.';
    return;
  }

  const submit = $('waitlist-submit');
  submit.disabled = true;
  try {
    if (honeypot) {
      showWaitlistSuccess();
      return;
    }

    const cfgRes = await fetch('/contact/config');
    const cfg = cfgRes.ok ? await cfgRes.json() : {};
    const mailKey = (cfg && cfg.web3formsAccessKey) || '';
    if (!mailKey) throw new Error('mail');

    const site = scan && scan.url ? scan.url : '';
    const mailed = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: mailKey,
        subject: 'A11xyz Pro waitlist from ' + name,
        from_name: 'A11xyz',
        name,
        email,
        replyto: email,
        message: 'Join Pro waitlist\nEmail: ' + email + (site ? '\nSite: ' + site : ''),
      }),
    });
    const data = await mailed.json().catch(() => ({}));
    if (!mailed.ok || !data.success) throw new Error('mail');

    await fetch('/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'pro-waitlist',
        name,
        email,
        message: 'Join Pro waitlist',
        url: site,
        website_fax: '',
      }),
    }).catch(() => {});

    showWaitlistSuccess();
  } catch {
    errorEl.hidden = false;
    errorEl.textContent = 'Could not send. Email maevepepple@gmail.com instead.';
  } finally {
    submit.disabled = false;
  }
}

export function setScanResult(data) {
  scan = data;
  const button = $('btn-report');
  if (button) button.hidden = !data;
}

export function initReportUi() {
  sheetStyle = document.createElement('style');
  sheetStyle.textContent = reportSheetCss();
  document.head.appendChild(sheetStyle);

  $('btn-report')?.addEventListener('click', openReport);
  $('btn-report-back')?.addEventListener('click', closeReport);
  $('btn-report-download')?.addEventListener('click', downloadPdf);
  $('btn-audit-cta')?.addEventListener('click', () => {
    track('audit_cta_clicked');
  });
  $('btn-waitlist')?.addEventListener('click', () => {
    track('pro_waitlist_clicked');
    openWaitlist();
  });
  $('waitlist-close')?.addEventListener('click', closeWaitlist);
  $('waitlist-done')?.addEventListener('click', closeWaitlist);
  $('waitlist-form')?.addEventListener('submit', submitWaitlist);

  const preview = $('report-preview');
  const waitlist = $('waitlist-modal');

  preview?.addEventListener('click', (event) => {
    if (event.target.closest('.report-toolbar, .report-stage, .report-teaser, .report-pdf-status')) return;
    closeReport();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (waitlist && !waitlist.hidden) {
        event.preventDefault();
        closeWaitlist();
        return;
      }
      if (preview && !preview.hidden) {
        event.preventDefault();
        closeReport();
      }
      return;
    }
    if (waitlist && !waitlist.hidden) trapFocus(waitlist, event);
    else if (preview && !preview.hidden) trapFocus(preview, event);
  });
}

initReportUi();
window.a11xyzReport = { setScanResult, initReportUi, openReport, closeReport };
if (window.a11xyzScan) setScanResult(window.a11xyzScan);
