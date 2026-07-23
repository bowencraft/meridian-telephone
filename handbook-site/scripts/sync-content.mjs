import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const repoRoot = path.resolve(siteRoot, "..")
const storyRoot = path.join(repoRoot, "story-outline")
const contentRoot = path.join(siteRoot, "content")
const storyJsonPath = path.join(repoRoot, "src/story/telephone.rules.json")
const boothItemsPath = path.join(repoRoot, "src/game/boothItems.ts")
const manifestPath = path.join(siteRoot, ".generated-manifest.json")

const expected = {
  authorSources: 74,
  wikiSources: 7,
  chapters: 6,
  phones: 8,
  rings: 3,
  wallObjects: 6,
  counterObjects: 4,
  endings: 7,
}

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

function relativeStoryPath(filePath) {
  return path.relative(storyRoot, filePath).split(path.sep).join("/")
}

function isPublishableSource(relativePath) {
  const segments = relativePath.split("/")
  const filename = segments.at(-1) ?? ""
  if (!filename.endsWith(".md")) return false
  if (filename === "AGENTS.md") return false
  if (filename.includes("_template") || filename.includes("-template")) return false
  if (segments.some((segment) => ["style", "styles", "published"].includes(segment))) return false
  return true
}

function splitFrontmatter(raw, sourcePath) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) throw new Error(`${sourcePath} 缺少YAML frontmatter`)
  return { frontmatter: match[1].trimEnd(), body: raw.slice(match[0].length).trimStart() }
}

function frontmatterValue(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(?:"([^"]*)"|'([^']*)'|(.+))$`, "m"))
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim()
}

function renderDocument({ frontmatter, body }, extras, notice) {
  const extraKeys = new Set([...Object.keys(extras), "published"])
  const cleanedFrontmatter = frontmatter
    .split("\n")
    .filter((line) => {
      const key = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):/)?.[1]
      return !key || !extraKeys.has(key)
    })
    .join("\n")
  const injected = Object.entries(extras).map(([key, value]) => `${key}: ${value}`)
  const warning = notice ? `> [!warning] 开发记录\n> **[网页未实装]** ${notice}\n\n` : ""
  return `---\n${cleanedFrontmatter}\n${injected.join("\n")}\n---\n${warning}${body.trimEnd()}\n`
}

async function write(relativePath, contents) {
  const target = path.join(contentRoot, relativePath)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, contents, "utf8")
}

function pageFrontmatter({ title, surface, tier, tags = [] }) {
  return `---\ntitle: ${JSON.stringify(title)}\npublish: true\nsurface: ${surface}\ncanon_tier: ${tier}\ncssclasses: [surface-${surface}, canon-${tier}]\ntags: ${JSON.stringify(tags)}\n---\n`
}

function chapterDraft(raw, sourcePath) {
  const draftMarker = "\n## Draft\n"
  const revisionMarker = "\n## Revision Notes\n"
  const start = raw.indexOf(draftMarker)
  const end = raw.indexOf(revisionMarker)
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`${sourcePath} 缺少唯一的Draft/Revision Notes区间`)
  }
  return raw.slice(start + draftMarker.length, end).trim()
}

const allFiles = await walk(storyRoot)
const sourceFiles = allFiles
  .map((filePath) => ({ filePath, relativePath: relativeStoryPath(filePath) }))
  .filter(({ relativePath }) => isPublishableSource(relativePath))
  .sort((a, b) => a.relativePath.localeCompare(b.relativePath, "en"))

const wikiFiles = sourceFiles.filter(({ relativePath }) => relativePath.startsWith("wiki/"))
const chapterFiles = sourceFiles.filter(({ relativePath }) =>
  /^chapters\/\d{3}\.[a-z0-9-]+\.md$/.test(relativePath),
)

if (sourceFiles.length !== expected.authorSources) {
  throw new Error(`作者源文件应为${expected.authorSources}个，实际${sourceFiles.length}个`)
}
if (wikiFiles.length !== expected.wikiSources) {
  throw new Error(`Wiki源文件应为${expected.wikiSources}个，实际${wikiFiles.length}个`)
}
if (chapterFiles.length !== expected.chapters) {
  throw new Error(`章节应为${expected.chapters}个，实际${chapterFiles.length}个`)
}

await fs.rm(contentRoot, { recursive: true, force: true })
await fs.mkdir(contentRoot, { recursive: true })

for (const source of sourceFiles) {
  const raw = await fs.readFile(source.filePath, "utf8")
  const parsed = splitFrontmatter(raw, source.relativePath)
  if (source.relativePath === "README.md") {
    parsed.body = parsed.body
      .replaceAll("[`characters/`](characters/)", "[[archive/characters/index|characters/]]")
      .replaceAll("[`materials/`](materials/)", "[[archive/materials/index|materials/]]")
      .replaceAll("[`AGENTS.md`](AGENTS.md)", "`AGENTS.md`（仅供本地写作，不发布到网页）")
  }
  const isWiki = source.relativePath.startsWith("wiki/")
  const isHome = source.relativePath === "wiki/000.handbook-entry.md"
  const outputPath = isHome
    ? "index.md"
    : isWiki
      ? source.relativePath
      : `archive/${source.relativePath}`
  const surface = isHome ? "home" : isWiki ? "wiki" : "archive"
  const tier = isWiki ? "deployed" : "development"
  const modified =
    frontmatterValue(parsed.frontmatter, "updated") ||
    frontmatterValue(parsed.frontmatter, "created")
  const notice = isWiki
    ? undefined
    : "本页来自长篇扩写或历史开发记录，不代表当前40节点网页游戏已经实现。活动事实请以关系Wiki为准。"

  await write(
    outputPath,
    renderDocument(
      parsed,
      {
        publish: "true",
        surface,
        canon_tier: tier,
        cssclasses: `[surface-${surface}, canon-${tier}]`,
        ...(modified ? { modified: JSON.stringify(modified) } : {}),
        source_path: JSON.stringify(`story-outline/${source.relativePath}`),
      },
      notice,
    ),
  )
}

const storyLinks = []
for (let index = 0; index < chapterFiles.length; index += 1) {
  const source = chapterFiles[index]
  const raw = await fs.readFile(source.filePath, "utf8")
  const parsed = splitFrontmatter(raw, source.relativePath)
  const title = frontmatterValue(parsed.frontmatter, "title") || `第${index + 1}章`
  const filename = path.basename(source.relativePath)
  const slug = filename.replace(/\.md$/, "")
  const previous = chapterFiles[index - 1]
  const next = chapterFiles[index + 1]
  const previousLink = previous
    ? `[[story/${path.basename(previous.relativePath, ".md")}|← 上一章]]`
    : "← 已到开篇"
  const nextLink = next
    ? `[[story/${path.basename(next.relativePath, ".md")}|下一章 →]]`
    : "已到终章 →"
  const nav = `###### ${previousLink} · [[story/index|小说目录]] · ${nextLink}`

  const contents = `${pageFrontmatter({
    title,
    surface: "story",
    tier: "expanded",
    tags: ["网页小说", "网页未实装"],
  })}# ${title}\n\n> [!warning] 开发稿\n> **[网页未实装]** 本章是Telephone的长篇扩写正文，不代表当前40节点网页游戏已经实现其中人物、号码或Seedline设定。\n\n${nav}\n\n${chapterDraft(raw, source.relativePath)}\n\n${nav}\n`

  await write(`story/${slug}.md`, contents)
  storyLinks.push(`- [[story/${slug}|${title}]]`)
}

await write(
  "wiki/index.md",
  `${pageFrontmatter({ title: "关系Wiki", surface: "wiki", tier: "deployed", tags: ["Wiki"] })}# 关系Wiki\n\n这里整理当前游戏已经部署的人物声音、电话、物件、通话流程、结局与重玩档案。\n\n- [[wiki/010.deployed-canon-ledger|活动正史账本]]\n- [[wiki/020.phone-directory|活动电话簿]]\n- [[wiki/030.object-clue-index|电话亭物件与线索]]\n- [[wiki/040.call-flow|通话、分支与七结局]]\n- [[wiki/050.timeline-and-replay|通话档案与重新开始]]\n- [[wiki/060.terms|最少必要词汇]]\n`,
)

await write(
  "story/index.md",
  `${pageFrontmatter({ title: "网页小说", surface: "story", tier: "expanded", tags: ["网页小说", "网页未实装"] })}# 网页小说\n\n> [!warning] 开发稿\n> **[网页未实装]** 六章正文是围绕当前电话亭创作的长篇扩写；人物、额外号码和Seedline设定尚未进入当前游戏。\n\n${storyLinks.join("\n")}\n`,
)

await write(
  "archive/index.md",
  `${pageFrontmatter({ title: "幕后档案", surface: "archive", tier: "development", tags: ["幕后", "网页未实装"] })}# 幕后档案\n\n> [!warning] 开发记录\n> **[网页未实装]** 这里保存完整扩写源、大纲与开发记录。它们可以解释创作方向，但不等于当前游戏实现。\n\n- [[archive/project|项目说明]]\n- [[archive/README|工作区导航]]\n- [[archive/TASKS|任务书]]\n- [[archive/characters/index|人物档案]]\n- [[archive/materials/index|素材与线索]]\n- [[archive/plot/index|剧情设计]]\n- [[archive/world/index|世界设定]]\n- [[archive/chapters/index|章节编辑容器]]\n- [[archive/outlines/index|章节大纲与审计]]\n- [[archive/implementation/index|实施与盲测记录]]\n`,
)

const story = JSON.parse(await fs.readFile(storyJsonPath, "utf8"))
const phone = story.globals.phone
const telephone = story.extensions.telephone
const boothSource = await fs.readFile(boothItemsPath, "utf8")
const objectBlock = boothSource.match(/BOOTH_OBJECTS[^=]*=\s*\[([\s\S]*?)\n\]/)?.[1] ?? ""
const counterObjectIds = [...objectBlock.matchAll(/\bid:\s*'([^']+)'/g)].map((match) => match[1])

const index = {
  generatedAt: new Date().toISOString(),
  storyId: story.id,
  title: story.title,
  counts: {
    nodes: story.nodes.length,
    edges: story.edges.length,
    phones: phone.validNumbers.length,
    rings: phone.idleRingSchedule.length,
    wallObjects: telephone.sceneHotspots.length,
    counterObjects: counterObjectIds.length,
    endings: Object.keys(telephone.endings).length,
  },
  phones: phone.validNumbers,
  rings: phone.idleRingSchedule,
  wallObjects: telephone.sceneHotspots,
  counterObjectIds,
  endings: telephone.endings,
}

await write("static/telephone-index.json", `${JSON.stringify(index, null, 2)}\n`)

const manifest = {
  generatedAt: index.generatedAt,
  authorSourceCount: sourceFiles.length,
  wikiSourceCount: wikiFiles.length,
  archiveSourceCount: sourceFiles.length - wikiFiles.length,
  storyPageCount: chapterFiles.length,
  generatedIndexCount: 3,
  outputMarkdownCount: sourceFiles.length + chapterFiles.length + 3,
  sourceFiles: sourceFiles.map(({ relativePath }) => relativePath),
  runtimeCounts: index.counts,
}

await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8")
console.log(`Handbook content synced: ${manifest.outputMarkdownCount} Markdown pages`)
