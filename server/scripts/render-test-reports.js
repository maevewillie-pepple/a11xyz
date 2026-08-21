import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { chromium } from 'playwright';
import { chromiumLaunchOptions } from '../playwrightBrowser.js';
import { renderReportPdf } from '../reportPdf.js';
import { buildReportDocument } from '../../report-model.js';
import { renderReportSheetHtml, reportSheetCss, screenshotBitmapCss } from '../../report-layout.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, '.tmp-report-tests');

function issue(partial) {
  return {
    ruleId: 'link-name',
    severity: 'serious',
    category: 'Vague link text',
    wcag: '2.4.4',
    title: 'Link has no accessible name',
    selector: 'a.icon-link',
    html: '<a href="/pricing"><svg></svg></a>',
    why: 'A link without an accessible name may be announced without enough information to understand its purpose.',
    fixText: 'Give every link an accessible name that communicates its destination or purpose.',
    fixCode: '<a href="/pricing">View pricing</a>',
    boundingBox: { x: 80, y: 120, width: 48, height: 48 },
    ...partial,
  };
}

const RULES = [
  { ruleId: 'link-name', severity: 'serious', wcag: '2.4.4', title: 'Link has no accessible name', category: 'Vague link text', html: '<a href="/pricing"><svg></svg></a>', fixCode: '<a href="/pricing">View pricing</a>', why: 'Screen reader users can navigate through a list of links without reading the surrounding page. A link without an accessible name may therefore be announced without enough information to understand its purpose.', fixText: 'Use descriptive visible link text where possible. If the accessible name needs additional context, use an appropriate programmatic labelling technique.' },
  { ruleId: 'button-name', severity: 'serious', wcag: '4.1.2', title: 'Button has no accessible name', category: 'Missing ARIA & labels', html: '<button><svg></svg></button>', fixCode: '<button aria-label="Close"><svg></svg></button>', why: 'Icon-only buttons with no name are announced as "button", so nobody hears whether it closes, plays, or submits.', fixText: 'Add visible text, aria-label, or aria-labelledby that names the action.' },
  { ruleId: 'image-alt', severity: 'crit', wcag: '1.1.1', title: 'Image has no alt text', category: 'Missing ARIA & labels', html: '<img src="hero.jpg">', fixCode: '<img src="hero.jpg" alt="A short description">', why: 'Without alt text, the image is skipped or announced as a filename, so the meaning is lost.', fixText: 'Add alt text that describes the image, or alt="" if it is decorative.' },
  { ruleId: 'label', severity: 'crit', wcag: '1.3.1', title: 'Form field is missing a label', category: 'Unlabelled form fields', html: '<input type="email" placeholder="Email">', fixCode: '<label for="email">Email</label>\n<input id="email" type="email">', why: 'A placeholder is not a label; once you type, it disappears and the field has no name.', fixText: 'Associate a label with the input using for/id, or wrap the input in a label.' },
  { ruleId: 'color-contrast', severity: 'serious', wcag: '1.4.3', title: 'Text contrast is below the AA minimum', category: 'Colour contrast', html: '<p class="muted">Secondary copy</p>', fixCode: 'color: #17160F;\nbackground: #FFFFFF;', why: 'If the ratio is too low, letters blend into the page. Low vision users, and anyone in bright light, cannot read this text comfortably.', fixText: 'Darken the text or lighten the background until the contrast ratio is at least 4.5:1 (3:1 for large text).' },
  { ruleId: 'html-has-lang', severity: 'serious', wcag: '3.1.1', title: 'Page language is not set', category: 'Heading & structure', html: '<html>', fixCode: '<html lang="en">', why: 'Screen readers use lang to pick a voice and pronunciation. Missing lang often means English words read as if they were another language.', fixText: 'Add a lang attribute on the html element.' },
  { ruleId: 'heading-order', severity: 'moderate', wcag: '1.3.1', title: 'Heading levels are skipped', category: 'Heading & structure', html: '<h1>Shop</h1><h4>Shoes</h4>', fixCode: '<h1>Shop</h1>\n<h2>Shoes</h2>', why: 'Skipping from h1 to h4 breaks that outline, so a screen reader heading list no longer matches the real structure.', fixText: 'Use headings in order: h1, then h2, then h3, without jumps.' },
  { ruleId: 'region', severity: 'moderate', wcag: '1.3.1', title: 'Content is not inside a landmark', category: 'Heading & structure', html: '<div class="promo">Sale</div>', fixCode: '<main>\n  <article>...</article>\n</main>', why: 'Content left outside landmarks has no region name, so it does not appear in a landmark list and is easy to miss.', fixText: 'Place content in header, nav, main, aside, or footer.' },
  { ruleId: 'empty-heading', severity: 'moderate', wcag: '1.3.1', title: 'Heading is empty', category: 'Heading & structure', html: '<h2></h2>', fixCode: '<h2>Section title</h2>', why: 'If a heading is empty, screen readers still announce "heading" with no words.', fixText: 'Put text in the heading, or remove it if it is not needed.' },
  { ruleId: 'tabindex', severity: 'minor', wcag: '2.4.3', title: 'Positive tabindex changes focus order', category: 'No keyboard support', html: '<a href="/shop" tabindex="3">Shop</a>', fixCode: '<a href="/shop">Shop</a>', why: 'A positive tabindex pulls the control to the front of the queue and makes the rest of the page unpredictable.', fixText: 'Remove positive tabindex values. Use 0 or -1 only if you must.' },
  { ruleId: 'document-title', severity: 'moderate', wcag: '2.4.2', title: 'Page is missing a title', category: 'Heading & structure', html: '<title></title>', fixCode: '<title>Pricing · Example</title>', why: 'Without a document title, every tab sounds like the URL.', fixText: 'Add a unique, descriptive title in the document head.' },
  { ruleId: 'frame-title', severity: 'minor', wcag: '4.1.2', title: 'iframe has no title', category: 'Missing ARIA & labels', html: '<iframe src="/embed"></iframe>', fixCode: '<iframe src="/embed" title="Product demo video"></iframe>', why: 'No title means an unnamed frame, so people cannot decide whether to enter it.', fixText: 'Add a title that describes the frame contents.' },
];

function fakePageHtml(height) {
  const blocks = Math.max(4, Math.ceil(height / 280));
  const sections = Array.from({ length: blocks }, (_, i) => {
    const bg = i % 2 === 0 ? '#FAFAF8' : '#F3F0E8';
    return `<section style="min-height:280px;padding:32px 48px;background:${bg};">
      <h2 style="font-size:28px;margin:0 0 12px;font-weight:400;">Section ${i + 1}</h2>
      <p style="max-width:520px;color:#3F3D36;">Product copy, navigation and media sit in this band of the page so the screenshot has real layout to annotate.</p>
      <p><a href="/shop" style="color:#2150C2;">Shop the collection</a></p>
      <div style="margin-top:24px;width:160px;height:44px;background:#17160F;color:#fff;display:flex;align-items:center;justify-content:center;">Primary action</div>
    </section>`;
  }).join('');
  return `<!DOCTYPE html><html lang="en"><body style="margin:0;font-family:system-ui,sans-serif;color:#17160F;">
    <header style="padding:20px 48px;border-bottom:1px solid #E7E3D9;display:flex;justify-content:space-between;">
      <strong>Northshore</strong>
      <nav><a href="/" style="margin-right:16px;color:#17160F;">Home</a><a href="/shop" style="color:#17160F;">Shop</a></nav>
    </header>
    ${sections}
  </body></html>`;
}

async function capturePage(browser, height) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.setContent(fakePageHtml(height), { waitUntil: 'load' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate((h) => {
    document.body.style.minHeight = `${h}px`;
  }, height);
  const screenshotBuffer = await page.screenshot({ fullPage: true, type: 'png' });
  const pageSize = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  }));
  await page.close();
  return { screenshotBuffer, pageSize };
}

function placeIssues(defs, pageSize, count) {
  const issues = [];
  for (let i = 0; i < count; i += 1) {
    const rule = defs[i % defs.length];
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 80 + col * 360;
    const y = Math.min(pageSize.height - 80, 90 + row * Math.max(70, Math.floor(pageSize.height / Math.max(4, Math.ceil(count / 3)))));
    issues.push(
      issue({
        ...rule,
        selector: `${rule.html?.startsWith('<a') ? 'a' : 'div'}:nth-of-type(${i + 1})`,
        boundingBox: { x, y, width: 72 + (i % 3) * 20, height: 28 + (i % 2) * 16 },
      }),
    );
  }
  return issues;
}

function tally(issues) {
  const summary = { crit: 0, serious: 0, moderate: 0, minor: 0 };
  for (const item of issues) {
    if (summary[item.severity] !== undefined) summary[item.severity] += 1;
  }
  return summary;
}

async function writeScan(shotDir, url, page, issues) {
  const id = randomBytes(8).toString('hex');
  const filename = `${id}.png`;
  await fs.writeFile(path.join(shotDir, filename), page.screenshotBuffer);
  return {
    url,
    scannedAt: '2026-08-21T12:00:00.000Z',
    summary: tally(issues),
    screenshot: `/screenshots/${filename}`,
    pageSize: page.pageSize,
    issues,
  };
}

async function previewPng(browser, scan, screenshotDir, outFile) {
  const doc = buildReportDocument(scan, { tier: 'free' });
  const name = (scan.screenshot || '').replace('/screenshots/', '');
  const bytes = await fs.readFile(path.join(screenshotDir, name));
  const src = `data:image/png;base64,${bytes.toString('base64')}`;
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
    <style>html,body{margin:0;background:#fff;} ${reportSheetCss()} ${screenshotBitmapCss(src)}
      .report-sheet{padding:16mm;}
    </style></head><body>${renderReportSheetHtml(doc)}</body></html>`;
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: outFile, fullPage: true, type: 'png' });
  await page.close();
}

async function main() {
  await fs.rm(OUT, { recursive: true, force: true });
  const shotDir = path.join(OUT, 'screenshots');
  await fs.mkdir(shotDir, { recursive: true });
  process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || `${process.env.HOME}/Library/Caches/ms-playwright`;

  const browser = await chromium.launch(chromiumLaunchOptions());
  try {
    const fewPage = await capturePage(browser, 900);
    const manyPage = await capturePage(browser, 1600);
    const longPage = await capturePage(browser, 5200);
    const mildPage = await capturePage(browser, 1100);

    const few = await writeScan(
      shotDir,
      'https://www.example.com/',
      fewPage,
      placeIssues(RULES.slice(0, 2), fewPage.pageSize, 2),
    );
    const many = await writeScan(
      shotDir,
      'https://www.asos.com/',
      manyPage,
      placeIssues(RULES, manyPage.pageSize, 24),
    );
    const long = await writeScan(
      shotDir,
      'https://www.example.com/journal',
      longPage,
      [
        ...placeIssues(RULES.slice(0, 3), { ...longPage.pageSize, height: 900 }, 3),
        issue({
          ...RULES[6],
          boundingBox: { x: 120, y: Math.floor(longPage.pageSize.height * 0.48), width: 280, height: 40 },
        }),
        issue({
          ...RULES[0],
          boundingBox: { x: 200, y: longPage.pageSize.height - 220, width: 90, height: 36 },
        }),
      ],
    );
    const mild = await writeScan(
      shotDir,
      'https://www.example.com/about',
      mildPage,
      placeIssues(RULES.filter((rule) => rule.severity === 'moderate' || rule.severity === 'minor'), mildPage.pageSize, 6),
    );

    const cases = [
      ['few', few],
      ['many', many],
      ['long', long],
      ['moderate-only', mild],
    ];

    for (const [name, scan] of cases) {
      const { pdf, filename } = await renderReportPdf(scan, shotDir);
      await fs.writeFile(path.join(OUT, `${name}-${filename}`), pdf);
      await previewPng(browser, scan, shotDir, path.join(OUT, `${name}-preview.png`));
      console.log(name, 'issues', scan.issues.length, 'summary', JSON.stringify(scan.summary), 'pdf', pdf.length);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
