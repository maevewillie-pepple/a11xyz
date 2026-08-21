import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 8;
const hits = new Map();

export function contactConfig() {
  return {
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || '',
    web3formsAccessKey: (process.env.WEB3FORMS_ACCESS_KEY || '').trim(),
  };
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_MAX;
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, skipped: true };
  if (!token) return { ok: false, error: 'Confirm you are human, then try again.' };

  const body = new URLSearchParams({
    secret,
    response: token,
    remoteip: ip,
  });
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json().catch(() => null);
  if (!data?.success) return { ok: false, error: 'The captcha check failed. Refresh and try again.' };
  return { ok: true };
}

export async function handleContact(req, res, contactDir) {
  const ip = clientIp(req);
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'Too many messages. Try again in a few minutes.' });
  }

  const honeypot = typeof req.body?.website_fax === 'string' ? req.body.website_fax.trim() : '';
  if (honeypot) {
    return res.json({ ok: true });
  }

  const type = req.body?.type === 'whats-next'
    ? 'whats-next'
    : req.body?.type === 'audit'
      ? 'audit'
      : req.body?.type === 'pro-waitlist'
        ? 'pro-waitlist'
        : '';
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  const message = typeof req.body?.message === 'string'
    ? req.body.message.trim()
    : type === 'pro-waitlist'
      ? 'Join Pro waitlist'
      : '';
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  const organisation = typeof req.body?.organisation === 'string' ? req.body.organisation.trim() : '';
  const need = typeof req.body?.need === 'string' ? req.body.need.trim() : '';
  const token = typeof req.body?.turnstileToken === 'string' ? req.body.turnstileToken.trim() : '';

  if (type === 'pro-waitlist') {
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }
  } else if (!type || !name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and a message are required.' });
  }
  if (!isEmail(email) || name.length > 200 || email.length > 200 || message.length > 4000) {
    return res.status(400).json({ error: 'Check the form and try again.' });
  }
  if (url && url.length > 500) {
    return res.status(400).json({ error: 'Check the form and try again.' });
  }

  if (type !== 'pro-waitlist') {
    try {
      const captcha = await verifyTurnstile(token, ip);
      if (!captcha.ok) {
        return res.status(400).json({ error: captcha.error });
      }
    } catch (err) {
      console.error('[contact] turnstile', err);
      return res.status(502).json({ error: 'The captcha check could not run. Try again.' });
    }
  }

  const record = {
    id: randomBytes(8).toString('hex'),
    type,
    name: name || (type === 'pro-waitlist' ? 'Waitlist' : name),
    email,
    url,
    organisation,
    need,
    message,
    receivedAt: new Date().toISOString(),
  };

  await fs.writeFile(
    path.join(contactDir, `${Date.now()}-${record.id}.json`),
    JSON.stringify(record, null, 2),
  );

  console.log('[contact] saved', type, email);
  res.json({ ok: true });
}
