const { createServer } = require('https')
const next = require('next')
const fs = require('fs')
const path = require('path')
const Redis = require('ioredis')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000

// Create Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Load SSL certificates
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certs', 'localhost+2-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'localhost+2.pem')),
}

async function bumpSessionVersionOnStart() {
  if (!(process.env.NODE_ENV === 'production' || process.env.INVALIDATE_SESSIONS_ON_START === 'true')) {
    return
  }

  const sessionVersionKey = 'app:session:version'
  const kvUrl = process.env.KV_URL
  const redisUrl = kvUrl || process.env.REDIS_URL || 'redis://localhost:6379'

  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000)
      return delay
    },
  })

  try {
    const newVersion = await client.incr(sessionVersionKey)
    console.log(`[Init] Session version incremented to ${newVersion}`)

    // Rotate the effective NextAuth secret on each version bump.
    // This makes existing JWT session cookies fail verification after restart,
    // which forces a fresh login (middleware/getToken will return null).
    if (process.env.NEXTAUTH_SECRET) {
      process.env.NEXTAUTH_SECRET = `${process.env.NEXTAUTH_SECRET}:${newVersion}`
    }
  } finally {
    client.disconnect()
  }
}

app.prepare().then(async () => {
  await bumpSessionVersionOnStart()
  createServer(httpsOptions, async (req, res) => {
    try {
      await handle(req, res)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  }).listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on https://${hostname}:${port}`)
  })
})
