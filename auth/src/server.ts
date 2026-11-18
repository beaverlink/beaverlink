import { createServer } from 'node:http'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './auth.js'

const PORT = Number(process.env.PORT ?? 3000)
const HOST = process.env.HOST ?? '127.0.0.1'
const authHandler = toNodeHandler(auth)
const allowedOrigin = process.env.FRONTEND_URL

if (!allowedOrigin) {
  throw new Error('FRONTEND_URL is not configured')
}

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname
  const requestOrigin = req.headers.origin

  if (requestOrigin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Vary', 'Origin')
  }

  if (
    req.method === 'OPTIONS' &&
    pathname.startsWith('/api/auth/')
  ) {
    if (requestOrigin !== allowedOrigin) {
      res.writeHead(403)
      res.end()
      return
    } 
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    )
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization',
    )
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'GET' && pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok' }))
    return
  }

  if (pathname.startsWith('/api/auth/')) {
    try {
      // Use the actual connection address, not a user-supplied header.
      req.headers['x-client-ip'] = req.socket.remoteAddress ?? ''

      await authHandler(req, res)
    } catch (error) {
      console.error('Authentication request failed:', error)

      if (!res.headersSent) {
        res.writeHead(500)
        res.end('Internal Server Error')
      } else {
        res.destroy()
      }
    }
    return
  }

  res.writeHead(404)
  res.end('Not Found')
})

server.listen(PORT, HOST, () => {
  console.log(`Auth service listening on ${HOST}:${PORT}`)
})