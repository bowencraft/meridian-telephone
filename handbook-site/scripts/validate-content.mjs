import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const contentRoot = path.join(siteRoot, "content")
const manifest = JSON.parse(
  await fs.readFile(path.join(siteRoot, ".generated-manifest.json"), "utf8"),
)

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

const files = await walk(contentRoot)
const markdown = files.filter((file) => file.endsWith(".md"))
const relative = files.map((file) => path.relative(contentRoot, file).split(path.sep).join("/"))
const failures = []

if (manifest.authorSourceCount !== 74)
  failures.push(`作者源文件应为74，实际${manifest.authorSourceCount}`)
if (manifest.wikiSourceCount !== 7)
  failures.push(`Wiki源文件应为7，实际${manifest.wikiSourceCount}`)
if (manifest.storyPageCount !== 6) failures.push(`小说阅读页应为6，实际${manifest.storyPageCount}`)
if (markdown.length !== manifest.outputMarkdownCount)
  failures.push(`输出Markdown应为${manifest.outputMarkdownCount}，实际${markdown.length}`)

const expectedRuntime = {
  nodes: 40,
  edges: 74,
  phones: 8,
  rings: 3,
  wallObjects: 6,
  counterObjects: 4,
  endings: 7,
}
for (const [key, value] of Object.entries(expectedRuntime)) {
  if (manifest.runtimeCounts[key] !== value)
    failures.push(`运行时${key}应为${value}，实际${manifest.runtimeCounts[key]}`)
}

for (const file of relative) {
  if (/(^|\/)(AGENTS\.md|style|styles|published|internal)(\/|$)/.test(file))
    failures.push(`禁止发布的路径：${file}`)
  if (/template/i.test(file)) failures.push(`模板不应发布：${file}`)
}

for (const file of markdown) {
  const raw = await fs.readFile(file, "utf8")
  const rel = path.relative(contentRoot, file).split(path.sep).join("/")
  if (!/^---[\s\S]*?\npublish: true\n/m.test(raw)) failures.push(`缺少publish:true：${rel}`)
  if ((rel.startsWith("archive/") || rel.startsWith("story/")) && !raw.includes("[网页未实装]")) {
    failures.push(`扩写或幕后页面缺少[网页未实装]：${rel}`)
  }
}

if (!relative.includes("static/telephone-index.json")) failures.push("缺少活动数据索引")
if (relative.some((file) => file.includes("people-role-crosswalk")))
  failures.push("内部人物对照泄露到网页内容")

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"))
  process.exitCode = 1
} else {
  console.log(
    `Handbook validation passed: ${markdown.length} Markdown pages, runtime ${JSON.stringify(manifest.runtimeCounts)}`,
  )
}
