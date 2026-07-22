import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { FullSlug, joinSegments, pathToRoot } from "../util/path"

const script = `
function applyHandbookSurface() {
  const masthead = document.querySelector("[data-handbook-masthead]")
  const surface = masthead?.getAttribute("data-surface") || "archive"
  const tier = masthead?.getAttribute("data-canon-tier") || "development"
  document.documentElement.dataset.handbookSurface = surface
  document.documentElement.dataset.handbookCanon = tier
}
document.addEventListener("nav", applyHandbookSurface)
applyHandbookSurface()
`

export default (() => {
  const HandbookMasthead: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
    const slug = (fileData.slug ?? "index") as FullSlug
    const root = pathToRoot(slug)
    const surface = String(fileData.frontmatter?.surface ?? "archive")
    const canonTier = String(fileData.frontmatter?.canon_tier ?? "development")
    const isDeployed = canonTier === "deployed"

    return (
      <aside
        class="handbook-masthead"
        data-handbook-masthead
        data-surface={surface}
        data-canon-tier={canonTier}
        aria-label="十九号夜班手册导航"
      >
        <a class="handbook-brand" href={root} aria-label="返回手册封面">
          <span class="handbook-brand-mark" aria-hidden="true">
            19
          </span>
          <span>
            <strong>十九号夜班手册</strong>
            <small>MERIDIAN COURTESY EXCHANGE · STAFF COPY</small>
          </span>
        </a>
        <nav class="handbook-nav" aria-label="主要分区">
          <a href={joinSegments(root, "wiki")}>关系 Wiki</a>
          <a href={joinSegments(root, "story")}>网页小说</a>
          <a href={joinSegments(root, "archive")}>幕后档案</a>
          <a class="return-to-booth" href="https://05-telephone.seeds100.bowen.wang/">
            返回电话亭
          </a>
        </nav>
        <span class={isDeployed ? "canon-stamp deployed" : "canon-stamp expanded"}>
          {isDeployed ? "活动正史" : "[网页未实装]"}
        </span>
      </aside>
    )
  }

  HandbookMasthead.displayName = "HandbookMasthead"
  HandbookMasthead.afterDOMLoaded = script
  return HandbookMasthead
}) satisfies QuartzComponentConstructor
