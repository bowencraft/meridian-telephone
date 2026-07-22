import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { createAdminApiMiddleware } from './server/adminApi'

const storyDefinitionPath = path.resolve('src/story/telephone.rules.json')

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const adminPassword = env.ADMIN_PASSWORD ?? ''
  const sessionTtlMs = positiveInteger(env.ADMIN_SESSION_TTL_SECONDS, 8 * 60 * 60) * 1000
  const maxFailures = positiveInteger(env.ADMIN_LOGIN_MAX_FAILURES, 5)

  function adminApi(secureCookies: boolean, allowStoryWrites: boolean) {
    return createAdminApiMiddleware({
      adminPassword,
      storyDefinitionPath,
      allowStoryWrites,
      secureCookies,
      trustLoopbackProxy: secureCookies,
      sessionTtlMs,
      maxFailures,
    })
  }

  return {
    plugins: [
      react(),
      {
        name: 'telephone-admin-server-api',
        configureServer(server) {
          server.middlewares.use(adminApi(false, true))
        },
        configurePreviewServer(server) {
          server.middlewares.use(adminApi(true, false))
        },
      },
    ],
    server: { host: '127.0.0.1', port: 5173 },
    preview: {
      host: '127.0.0.1',
      port: 5184,
      strictPort: true,
      allowedHosts: ['05-telephone.seeds100.bowen.wang'],
    },
  }
})
