import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const publicRoot = path.join(siteRoot, "public")
const basePath = "/handbook"
const failures = []

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(fullPath)))
    else files.push(fullPath)
  }
  return files
}

async function exists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function pageUrl(relativeHtml) {
  const normalized = relativeHtml.split(path.sep).join("/")
  if (normalized === "index.html") return `${basePath}/`
  if (normalized.endsWith("/index.html")) {
    return `${basePath}/${normalized.slice(0, -"index.html".length)}`
  }
  return `${basePath}/${normalized.replace(/\.html$/, "")}`
}

function outputCandidates(urlPath) {
  let relative = decodeURIComponent(urlPath)
  if (relative === basePath || relative === `${basePath}/`) relative = ""
  else if (relative.startsWith(`${basePath}/`)) relative = relative.slice(basePath.length + 1)
  else if (relative.startsWith("/")) return []

  const clean = relative.replace(/^\/+|\/+$/g, "")
  if (!clean) return [path.join(publicRoot, "index.html")]
  if (/\.(?:css|js|mjs|json|png|jpe?g|gif|webp|svg|ico|xml|txt|map|woff2?|ttf)$/i.test(clean)) {
    return [path.join(publicRoot, clean)]
  }
  return [path.join(publicRoot, `${clean}.html`), path.join(publicRoot, clean, "index.html")]
}

const allFiles = await walk(publicRoot)
const htmlFiles = allFiles.filter((file) => file.endsWith(".html"))

for (const required of [
  "index.html",
  "wiki/index.html",
  "story/index.html",
  "archive/index.html",
]) {
  if (!(await exists(path.join(publicRoot, required)))) failures.push(`缺少入口：${required}`)
}

if (htmlFiles.length < 83) failures.push(`HTML输出过少：${htmlFiles.length}`)

for (const htmlFile of htmlFiles) {
  const html = await fs.readFile(htmlFile, "utf8")
  const relative = path.relative(publicRoot, htmlFile).split(path.sep).join("/")
  const currentUrl = new URL(pageUrl(relative), "https://handbook.invalid")

  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const raw = match[1].replaceAll("&amp;", "&")
    if (/^(?:https?:|mailto:|tel:|data:|javascript:|\/\/|#)/.test(raw)) continue
    const resolved = new URL(raw, currentUrl)
    const candidates = outputCandidates(resolved.pathname)
    if (!candidates.length) continue
    if (!(await Promise.all(candidates.map(exists))).some(Boolean)) {
      failures.push(`${relative} 存在失效本地链接：${raw}`)
    }
  }
}

const home = await fs.readFile(path.join(publicRoot, "index.html"), "utf8")
const story = await fs.readFile(path.join(publicRoot, "story", "index.html"), "utf8")
const archive = await fs.readFile(path.join(publicRoot, "archive", "index.html"), "utf8")
if (!home.includes("data-handbook-masthead")) failures.push("首页缺少自定义手册页头")
if (!home.includes("活动正史")) failures.push("首页缺少活动正史标记")
if (!story.includes("[网页未实装]")) failures.push("小说入口缺少[网页未实装]")
if (!archive.includes("[网页未实装]")) failures.push("幕后入口缺少[网页未实装]")

if (allFiles.some((file) => path.basename(file).includes("people-role-crosswalk"))) {
  failures.push("本地人物对照表被发布")
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"))
  process.exitCode = 1
} else {
  console.log(
    `Handbook build validation passed: ${htmlFiles.length} HTML files, no broken local links`,
  )
}
