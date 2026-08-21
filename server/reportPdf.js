import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { renderReportSheetHtml, reportSheetCss, screenshotBitmapCss } from '../report-layout.js';
import { buildReportDocument, reportFilename } from '../report-model.js';
import { chromiumLaunchOptions } from './playwrightBrowser.js';

const SCREENSHOT_NAME = /^[a-f0-9]+\.png$/i;

function screenshotName(screenshotUrl) {
  if (typeof screenshotUrl !== 'string') return '';
  const name = screenshotUrl.split('?')[0].replace(/^\/screenshots\//, '');
  return SCREENSHOT_NAME.test(name) ? name : '';
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function sanitizeScanPayload(body) {
  const scan = body && typeof body === 'object' ? (body.scan || body) : null;
  if (!scan || typeof scan !== 'object') return { error: 'Scan results are missing.' };
  if (!isHttpUrl(scan.url)) return { error: 'Scan results are missing a valid URL.' };
  if (!Array.isArray(scan.issues)) scan.issues = [];
  if (scan.issues.length > 800) scan.issues = scan.issues.slice(0, 800);
  return { scan };
}

function reportHtml(doc, screenshotSrc) {
  const title = doc.host
    ? `Accessibility Report · ${doc.host} · A11xyz`
    : 'Accessibility Report · A11xyz';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title.replace(/</g, '')}</title>
<link rel="preconnect" href="https://fonts.cdnfonts.com">
<link href="https://fonts.cdnfonts.com/css/geist-sans" rel="stylesheet">
<link href="https://fonts.cdnfonts.com/css/geist-mono" rel="stylesheet">
<style>
  @page { size: A4; margin: 16mm; }
  html, body { margin: 0; padding: 0; background: #fff; }
  ${reportSheetCss()}
  ${screenshotBitmapCss(screenshotSrc)}
</style>
</head>
<body>
${renderReportSheetHtml(doc)}
</body>
</html>`;
}

export async function renderReportPdf(scan, screenshotDir) {
  const doc = buildReportDocument(scan, { tier: 'free' });
  const filename = reportFilename(doc);
  const name = screenshotName(doc.screenshot);
  let screenshotSrc = '';
  if (name) {
    try {
      const file = path.join(screenshotDir, name);
      const bytes = await fs.readFile(file);
      screenshotSrc = `data:image/png;base64,${bytes.toString('base64')}`;
    } catch {
      screenshotSrc = '';
    }
  }

  const html = reportHtml(doc, screenshotSrc);
  const browser = await chromium.launch(chromiumLaunchOptions());
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 20_000 });
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });
    const pdfOptions = {
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    };
    let pdf;
    try {
      // Chromium tagged PDFs are structured, not a claim of PDF/UA conformance.
      pdf = await page.pdf({ ...pdfOptions, tagged: true, outline: true });
    } catch {
      pdf = await page.pdf(pdfOptions);
    }
    return { pdf, filename };
  } finally {
    await browser.close();
  }
}

export { reportHtml };
