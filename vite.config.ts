import { createHash } from 'node:crypto'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const storyDefinitionPath = path.resolve('src/story/telephone.rules.json')

function readRequestBody(request: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    request.on('data', (chunk) => { body += chunk })
    request.on('end', () => resolve(body))
    request.on('error', reject)
  })
}

function hasStoryShape(value: unknown): value is { format: string; nodes: unknown[]; edges: unknown[] } {
  if (!value || typeof value !== 'object') return false
  const story = value as { format?: unknown; nodes?: unknown; edges?: unknown }
  return story.format === 'graph-content' && Array.isArray(story.nodes) && Array.isArray(story.edges)
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const adminPassword = env.ADMIN_PASSWORD?.trim() ?? ''
  const adminPasswordHash = adminPassword
    ? createHash('sha256').update(adminPassword).digest('hex')
    : ''

  return {
    define: {
      'import.meta.env.VITE_ADMIN_PASSWORD_HASH': JSON.stringify(adminPasswordHash),
    },
    plugins: [
      react(),
      {
        name: 'telephone-story-definition-api',
        configureServer(server) {
          server.middlewares.use('/api/story-definition', async (request, response) => {
            response.setHeader('Content-Type', 'application/json; charset=utf-8')
            try {
              if (request.method === 'GET') {
                response.end(await readFile(storyDefinitionPath, 'utf8'))
                return
              }
              if (request.method === 'PUT') {
                const parsed = JSON.parse(await readRequestBody(request)) as unknown
                if (!hasStoryShape(parsed)) {
                  response.statusCode = 400
                  response.end(JSON.stringify({ error: 'Invalid Telephone graph document.' }))
                  return
                }
                await writeFile(storyDefinitionPath, `${JSON.stringify(parsed, null, 2)}\n`)
                response.end(JSON.stringify({ ok: true }))
                return
              }
              response.statusCode = 405
              response.end(JSON.stringify({ error: 'Method not allowed.' }))
            } catch (error) {
              response.statusCode = 500
              response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error.' }))
            }
          })
        },
      },
    ],
    server: { host: '127.0.0.1', port: 5173 },
  }
})
