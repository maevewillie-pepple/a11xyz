import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { chromiumLaunchOptions } from './playwrightBrowser.js';

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

/**
 * Runs in the page. Flags visible text below 12px (readability / WCAG 1.4.4).
 * Touch targets are covered by axe `target-size` (24px, WCAG 2.5.8).
 */
function collectSizeIssues() {
  const MIN_FONT_PX = 12;
  const MAX_TEXT_ISSUES = 60;
  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'META', 'LINK',
    'BR', 'HR', 'IMG', 'VIDEO', 'AUDIO', 'CANVAS', 'IFRAME', 'SVG', 'PATH',
    'SOURCE', 'TRACK',
  ]);

  function uniqueSelector(el) {
    if (el.id && document.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1) {
      return `#${CSS.escape(el.id)}`;
    }
    const chain = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.documentElement) {
      let part = node.nodeName.toLowerCase();
      const parent = node.parentElement;
      if (parent) {
        const siblings = [...parent.children].filter((c) => c.nodeName === node.nodeName);
        if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      }
      chain.unshift(part);
      if (node.id) {
        chain[0] = `#${CSS.escape(node.id)}`;
        break;
      }
      node = parent;
    }
    return chain.join('>');
  }

  function isVisible(el) {
    const st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) return false;
    if (st.clipPath === 'inset(50%)') return false;
    const clip = String(st.clip || '');
    if (/rect\(\s*0/.test(clip) || clip.includes('rect(1px')) return false;
    const r = el.getBoundingClientRect();
    return r.width >= 2 && r.height >= 2;
  }

  function hasReadableText(el) {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return true;
    if (el.tagName === 'SELECT') return true;
    for (const n of el.childNodes) {
      if (n.nodeType === Node.TEXT_NODE && String(n.textContent || '').replace(/\s+/g, '').length) return true;
    }
    return false;
  }

  function fontPx(el) {
    const n = parseFloat(getComputedStyle(el).fontSize);
    return Number.isFinite(n) ? n : 16;
  }

  function outermostSmall(el) {
    let outer = el;
    let node = el.parentElement;
    while (node && node !== document.body && node !== document.documentElement) {
      if (fontPx(node) < MIN_FONT_PX) outer = node;
      node = node.parentElement;
    }
    return outer;
  }

  function htmlSnippet(el) {
    const html = String(el.outerHTML || '').replace(/\s+/g, ' ').trim();
    return html.length > 240 ? `${html.slice(0, 237)}...` : html;
  }

  const seen = new Set();
  const issues = [];
  const nodes = document.body ? document.body.querySelectorAll('*') : [];

  const TARGET_MIN = 24;
  const MAX_TARGET_ISSUES = 80;
  const targetEls = document.querySelectorAll(
    'button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"], input[type="image"], summary',
  );
  for (const el of targetEls) {
    if (issues.length >= MAX_TARGET_ISSUES) break;
    if (el.closest('[aria-hidden="true"]') || !isVisible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (r.width >= TARGET_MIN && r.height >= TARGET_MIN) continue;
    const selector = uniqueSelector(el);
    const w = Math.round(r.width);
    const h = Math.round(r.height);
    issues.push({
      ruleId: 'target-size',
      impact: 'serious',
      help: 'All touch targets must be 24px large, or leave sufficient space',
      description: 'Ensure touch targets have sufficient size and space',
      helpUrl: '',
      tags: ['wcag22aa', 'wcag258'],
      html: htmlSnippet(el),
      failureSummary: `Fix any of the following:\n  Target is ${w} by ${h} CSS pixels (needs at least ${TARGET_MIN} by ${TARGET_MIN})`,
      any: [],
      target: [selector],
      selector,
    });
  }

  for (const el of nodes) {
    if (issues.filter((item) => item.ruleId === 'text-size').length >= MAX_TEXT_ISSUES) break;
    if (SKIP_TAGS.has(el.tagName) || el.closest('svg')) continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    if (!hasReadableText(el) || !isVisible(el)) continue;
    const size = fontPx(el);
    if (size >= MIN_FONT_PX) continue;

    const target = outermostSmall(el);
    if (seen.has(target)) continue;
    seen.add(target);

    const shown = Math.round(fontPx(target) * 10) / 10;
    const selector = uniqueSelector(target);
    issues.push({
      ruleId: 'text-size',
      impact: 'moderate',
      help: 'Text is smaller than 12px',
      description: 'Visible text is below 12 CSS pixels, which is hard to read at default zoom.',
      helpUrl: '',
      tags: ['wcag2aa', 'wcag144'],
      html: htmlSnippet(target),
      failureSummary: `Fix any of the following:\n  Font size is ${shown}px (needs at least ${MIN_FONT_PX}px)`,
      any: [],
      target: [selector],
      selector,
    });
  }

  return issues;
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
  const browser = await chromium.launch(chromiumLaunchOptions());
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
      // target-size is WCAG 2.2 AA (2.5.8, 24px) but disabled in axe by default.
      return await window.axe.run(document, {
        rules: {
          'target-size': { enabled: true },
        },
      });
    });
    const sizeIssues = await page.evaluate(collectSizeIssues);

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
    for (const extra of sizeIssues || []) {
      if (extra.ruleId === 'target-size') {
        const dup = flagged.some((item) => item.ruleId === 'target-size' && item.selector === extra.selector);
        if (dup) continue;
      }
      flagged.push(extra);
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

    const nodes = [];
    for (let i = 0; i < flagged.length; i += 1) {
      const item = {
        ...flagged[i],
        boundingBox: geometry[i].boundingBox,
        documentIndex: geometry[i].documentIndex,
      };
      if (item.ruleId === 'target-size' && item.boundingBox) {
        const dup = nodes.some((existing) => {
          if (existing.ruleId !== 'target-size' || !existing.boundingBox) return false;
          const a = existing.boundingBox;
          const b = item.boundingBox;
          return Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2
            && Math.abs(a.width - b.width) < 2 && Math.abs(a.height - b.height) < 2;
        });
        if (dup) continue;
      }
      nodes.push(item);
    }

    return { axeResults, screenshotBuffer, pageSize, nodes };
  } finally {
    await context.close();
    await browser.close();
  }
}
