import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

function visit(dir, depth, matches) {
  if (depth > 5) return;
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && (entry.name === 'chrome-headless-shell' || entry.name === 'chrome' || entry.name === 'Google Chrome for Testing')) {
      matches.push(full);
    } else if (entry.isDirectory() && entry.name !== 'node_modules') {
      visit(full, depth + 1, matches);
    }
  }
}

function existingPath(file) {
  try {
    return file && fs.existsSync(file) ? file : '';
  } catch {
    return '';
  }
}

export function playwrightChromiumPath() {
  const fromEnv = existingPath(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE);
  if (fromEnv) return fromEnv;

  try {
    const computed = existingPath(chromium.executablePath());
    if (computed) return computed;
  } catch {
    // fall through and search caches
  }

  const caches = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(os.homedir(), 'Library/Caches/ms-playwright'),
  ].filter(Boolean);

  const matches = [];
  for (const cache of caches) visit(cache, 0, matches);

  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  return (
    matches.find((file) => file.includes('headless-shell') && file.includes(arch)) ||
    matches.find((file) => file.includes('headless-shell')) ||
    matches.find((file) => file.includes(arch)) ||
    matches[0] ||
    ''
  );
}

export function chromiumLaunchOptions() {
  const options = {
    headless: true,
    args:
      process.env.NODE_ENV === 'production'
        ? ['--no-sandbox', '--disable-dev-shm-usage']
        : [],
  };
  const executablePath = playwrightChromiumPath();
  if (executablePath) options.executablePath = executablePath;
  return options;
}
