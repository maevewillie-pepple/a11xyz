import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const staticPages = [
  'aria-landing.html',
  'results.html',
  'how-it-works.html',
  'what-we-catch.html',
  'learn.html',
  'learn-what-is-accessibility.html',
  'learn-designing.html',
  'learn-web.html',
  'learn-mobile.html',
  'learn-testing.html',
  'learn-product-teams.html',
  'components.html',
  'faq.html',
  'request-audit.html',
  'whats-next.html',
]

function sendHtml(res, file) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  fs.createReadStream(file).pipe(res)
}

function serveMarketingPages() {
  return {
    name: 'serve-marketing-pages',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0]
        if (url === '/contact' || url.startsWith('/contact/')) {
          next()
          return
        }
        if (url === '/' || url === '/index.html') {
          sendHtml(res, path.join(repoRoot, 'aria-landing.html'))
          return
        }
        const name = url.replace(/^\//, '')
        if (staticPages.includes(name)) {
          sendHtml(res, path.join(repoRoot, name))
          return
        }
        if (name === 'contact-form.js') {
          const file = path.join(repoRoot, 'contact-form.js')
          if (fs.existsSync(file)) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
            fs.createReadStream(file).pipe(res)
            return
          }
        }
        if (name.startsWith('illustrations/')) {
          const file = path.resolve(repoRoot, name)
          const illoRoot = path.join(repoRoot, 'illustrations')
          if (file.startsWith(illoRoot + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
            res.setHeader('Content-Type', 'image/png')
            fs.createReadStream(file).pipe(res)
            return
          }
        }
        next()
      })
    },
    writeBundle(options) {
      const outDir = options.dir || path.resolve(__dirname, 'dist')
      for (const name of staticPages) {
        fs.copyFileSync(path.join(repoRoot, name), path.join(outDir, name))
      }
      fs.copyFileSync(path.join(repoRoot, 'contact-form.js'), path.join(outDir, 'contact-form.js'))
      const illoSrc = path.join(repoRoot, 'illustrations')
      const illoDest = path.join(outDir, 'illustrations')
      fs.mkdirSync(illoDest, { recursive: true })
      for (const file of fs.readdirSync(illoSrc)) {
        if (file.endsWith('.png')) {
          fs.copyFileSync(path.join(illoSrc, file), path.join(illoDest, file))
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), serveMarketingPages()],
  server: {
    port: 5173,
    proxy: {
      '/audit': {
        target: 'http://127.0.0.1:3001',
        timeout: 120_000,
        proxyTimeout: 120_000,
      },
      '/health': 'http://127.0.0.1:3001',
      '/contact': {
        target: 'http://127.0.0.1:3001',
        timeout: 20_000,
        proxyTimeout: 20_000,
      },
      '/screenshots': {
        target: 'http://127.0.0.1:3001',
      },
    },
  },
})
