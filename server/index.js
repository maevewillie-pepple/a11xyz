import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { contactConfig, handleContact } from './contact.js';
import { buildReport } from './reportBuilder.js';
import { PageBlockedError, scanUrl } from './scanner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

async function loadEnvFile(file) {
  try {
    const text = await fs.readFile(file, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

await loadEnvFile(path.join(ROOT, '.env'));
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
const CONTACT_DIR = path.join(__dirname, 'contact-submissions');
const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
const PORT = Number(process.env.PORT) || 3001;

await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
await fs.mkdir(CONTACT_DIR, { recursive: true });

const app = express();
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '32kb' }));
app.use('/screenshots', express.static(SCREENSHOT_DIR));
app.use('/illustrations', express.static(path.join(ROOT, 'illustrations')));

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function sendStatic(res, file) {
  res.sendFile(path.join(ROOT, file));
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/', (_req, res) => sendStatic(res, 'aria-landing.html'));
app.get('/aria-landing.html', (_req, res) => sendStatic(res, 'aria-landing.html'));
app.get('/results.html', (_req, res) => sendStatic(res, 'results.html'));
app.get('/how-it-works.html', (_req, res) => sendStatic(res, 'how-it-works.html'));
app.get('/what-we-catch.html', (_req, res) => sendStatic(res, 'what-we-catch.html'));
app.get('/learn.html', (_req, res) => sendStatic(res, 'learn.html'));
app.get('/learn-what-is-accessibility.html', (_req, res) => sendStatic(res, 'learn-what-is-accessibility.html'));
app.get('/learn-designing.html', (_req, res) => sendStatic(res, 'learn-designing.html'));
app.get('/learn-web.html', (_req, res) => sendStatic(res, 'learn-web.html'));
app.get('/learn-mobile.html', (_req, res) => sendStatic(res, 'learn-mobile.html'));
app.get('/learn-testing.html', (_req, res) => sendStatic(res, 'learn-testing.html'));
app.get('/learn-product-teams.html', (_req, res) => sendStatic(res, 'learn-product-teams.html'));
app.get('/components.html', (_req, res) => sendStatic(res, 'components.html'));
app.get('/faq.html', (_req, res) => sendStatic(res, 'faq.html'));
app.get('/request-audit.html', (_req, res) => sendStatic(res, 'request-audit.html'));
app.get('/whats-next.html', (_req, res) => sendStatic(res, 'whats-next.html'));
app.get('/contact-form.js', (_req, res) => sendStatic(res, 'contact-form.js'));
app.get('/analytics.js', (_req, res) => sendStatic(res, 'analytics.js'));
app.get('/contact/config', (_req, res) => res.json(contactConfig()));
app.get('/analytics/config', (_req, res) =>
  res.json({
    posthogKey: (process.env.VITE_POSTHOG_KEY || process.env.POSTHOG_KEY || '').trim(),
    posthogHost: (process.env.VITE_POSTHOG_HOST || process.env.POSTHOG_HOST || '').trim(),
  }),
);

async function runAudit(url) {
  const scan = await scanUrl(url);
  const id = randomBytes(8).toString('hex');
  const filename = `${id}.png`;
  await fs.writeFile(path.join(SCREENSHOT_DIR, filename), scan.screenshotBuffer);
  return buildReport({
    url,
    nodes: scan.nodes,
    pageSize: scan.pageSize,
    screenshotUrl: `/screenshots/${filename}`,
  });
}

async function handleAudit(req, res, url) {
  if (!isHttpUrl(url)) {
    return res.status(400).json({ error: 'Provide a valid http(s) URL in { url }.' });
  }

  try {
    const report = await runAudit(url);
    res.json(report);
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown error';
    console.error('[audit]', url, detail);
    const blocked = err instanceof PageBlockedError;
    const unreachable = /net::|ENOTFOUND|ECONNREFUSED|Timeout|timeout|ERR_/i.test(detail);
    res.status(blocked ? 403 : unreachable ? 504 : 502).json({
      error: blocked
        ? err.message
        : unreachable
          ? 'Could not reach that page. Check the URL and try again.'
          : 'Audit failed.',
      detail,
    });
  }
}

app.post('/contact', async (req, res) => {
  try {
    await handleContact(req, res, CONTACT_DIR);
  } catch (err) {
    console.error('[contact]', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Could not send. Email maevepepple@gmail.com instead.' });
    }
  }
});

app.post('/audit', async (req, res) => {
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  await handleAudit(req, res, url);
});

app.get('/audit', async (req, res) => {
  const url = typeof req.query?.url === 'string' ? req.query.url.trim() : '';
  await handleAudit(req, res, url);
});

const server = app.listen(PORT, HOST, () => {
  console.log(`Aria server listening on http://${HOST}:${PORT}`);
  if (!(process.env.VITE_POSTHOG_KEY || process.env.POSTHOG_KEY) || !(process.env.VITE_POSTHOG_HOST || process.env.POSTHOG_HOST)) {
    console.warn('[analytics] PostHog key/host missing: set VITE_POSTHOG_KEY and VITE_POSTHOG_HOST');
  }
  if (!process.env.WEB3FORMS_ACCESS_KEY) {
    console.warn('[contact] WEB3FORMS_ACCESS_KEY missing: copy .env.example to .env');
  }
  if (!process.env.TURNSTILE_SITE_KEY || !process.env.TURNSTILE_SECRET_KEY) {
    console.warn('[contact] Turnstile keys missing: captcha is off until you add them');
  }
});
server.setTimeout(120_000);
server.requestTimeout = 120_000;
