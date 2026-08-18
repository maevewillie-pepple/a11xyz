import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const axe = require('axe-core');

const NAV_TIMEOUT_MS = 45_000;
const VIEWPORT = { width: 1280, height: 800 };
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export class PageBlockedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PageBlockedError';
  }
}

function lastSelector(target) {
  if (!Array.isArray(target) || target.length === 0) return '';
  const last = target[target.length - 1];
  return typeof last === 'string' ? last : '';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Cookie/consent dialogs sit on top of the real page and pollute both the
 * screenshot and the axe results. Click a reject/accept control if we can,
 * then remove leftover cookie dialogs.
 */
async function dismissOverlays(page) {
  await page.evaluate(() => {
    const label = (el) => ((el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim());
    const nodes = [...document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"], a')];
    const reject = nodes.find((el) => /reject analytics cookies|reject all|reject additional cookies|reject cookies|decline all|only essential|essential only|necessary only/i.test(label(el)));
    const accept = nodes.find((el) => /accept analytics cookies|accept all cookies|accept cookies|allow all|agree/i.test(label(el)));
    const el = reject || accept;
    if (el) el.click();
  });
  await sleep(700);
  await page.evaluate(() => {
    const looksLikeCookie = (el) => {
      const text = (el.innerText || '').toLowerCase();
      return text.includes('cookie') || text.includes('consent');
    };
    document.querySelectorAll('[role="dialog"], [aria-modal="true"]').forEach((el) => {
      if (looksLikeCookie(el)) el.remove();
    });
    document.querySelectorAll('[id*="cookie" i], [class*="cookie-banner" i], [class*="cookieBanner" i], [class*="CookieBanner" i]').forEach((el) => {
      if (looksLikeCookie(el) || el.querySelector('button')) el.remove();
    });
  });
  await sleep(400);
}

async function assertNotBlocked(page) {
  const sample = await page.evaluate(() => ({
    title: document.title || '',
    text: (document.body?.innerText || '').slice(0, 2500),
    href: location.href,
  }));
  const blob = `${sample.title}\n${sample.text}\n${sample.href}`.toLowerCase();
  const blocked =
    /access denied|you don't have permission to access|attention required|just a moment\.\.\.|enable javascript and cookies to continue|sorry, you have been blocked|error 1020|reference #[0-9a-f.]+/.test(
      blob,
    ) || /errors\.edgesuite\.net|cdn-cgi\/challenge/.test(blob);

  if (blocked) {
    throw new PageBlockedError(
      'This site blocked the scanner. Retail and media sites often run bot protection (Akamai, Cloudflare) that refuses headless browsers. You are seeing their error page, not the real site.',
    );
  }
}

/**
 * Launch Playwright, load the URL, run axe-core, capture a full-page screenshot
 * and document-order bounding boxes for every flagged element.
 */
export async function scanUrl(url) {
  const browser = await chromium.launch({
    headless: true,
    args:
      process.env.NODE_ENV === 'production'
        ? ['--no-sandbox', '--disable-dev-shm-usage']
        : [],
  });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    bypassCSP: true,
    userAgent: USER_AGENT,
    locale: 'en-GB',
    timezoneId: 'Europe/London',
    extraHTTPHeaders: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-GB,en;q=0.9',
    },
  });

  try {
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: NAV_TIMEOUT_MS });
    } catch (err) {
      if (page.url() === 'about:blank') throw err;
    }

    await dismissOverlays(page);
    await assertNotBlocked(page);

    // CDP evaluate, not a <script> tag: CSP cannot block this.
    await page.evaluate(axe.source);
    const axeResults = await page.evaluate(async () => {
      if (!window.axe) throw new Error('axe-core failed to inject into the page');
      return await window.axe.run();
    });

    const screenshotBuffer = await page.screenshot({ fullPage: true, type: 'png' });
    const pageSize = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }));

    const flagged = [];
    for (const violation of axeResults.violations || []) {
      for (const node of violation.nodes || []) {
        flagged.push({
          ruleId: violation.id,
          impact: violation.impact,
          help: violation.help,
          description: violation.description,
          helpUrl: violation.helpUrl,
          tags: violation.tags || [],
          html: node.html,
          failureSummary: node.failureSummary,
          any: node.any,
          target: node.target,
          selector: lastSelector(node.target),
        });
      }
    }

    const geometry = await page.evaluate((selectors) => {
      const all = document.getElementsByTagName('*');
      return selectors.map((sel) => {
        if (!sel) return { boundingBox: null, documentIndex: Number.MAX_SAFE_INTEGER };
        let el = null;
        try {
          el = document.querySelector(sel);
        } catch {
          el = null;
        }
        if (!el) return { boundingBox: null, documentIndex: Number.MAX_SAFE_INTEGER };
        const r = el.getBoundingClientRect();
        return {
          boundingBox: {
            x: r.x + window.scrollX,
            y: r.y + window.scrollY,
            width: r.width,
            height: r.height,
          },
          documentIndex: Array.prototype.indexOf.call(all, el),
        };
      });
    }, flagged.map((item) => item.selector));

    const nodes = flagged.map((item, i) => ({
      ...item,
      boundingBox: geometry[i].boundingBox,
      documentIndex: geometry[i].documentIndex,
    }));

    return { axeResults, screenshotBuffer, pageSize, nodes };
  } finally {
    await context.close();
    await browser.close();
  }
}
