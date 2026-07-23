import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import HandbookMasthead from "./quartz/components/HandbookMasthead"
import { HandbookFrontmatter } from "./quartz/plugins/transformers/handbookFrontmatter"
import { PageTypeDispatcher } from "./quartz/plugins/pageTypes"
import { registerCondition } from "./quartz/plugins/loader/conditions"

registerCondition("handbook-wiki", ({ fileData }) =>
  ["home", "wiki"].includes(String(fileData.frontmatter?.surface ?? "")),
)
const config = await loadQuartzConfig()
config.plugins.transformers.unshift(HandbookFrontmatter())

const loadedLayout = await loadQuartzLayout()
const masthead = HandbookMasthead()

loadedLayout.defaults.beforeBody = [masthead, ...(loadedLayout.defaults.beforeBody ?? [])]
for (const [pageType, pageLayout] of Object.entries(loadedLayout.byPageType)) {
  if (pageType !== "404") {
    pageLayout.beforeBody = [masthead, ...(pageLayout.beforeBody ?? [])]
  }
}

config.plugins.emitters = config.plugins.emitters.map((emitter) =>
  emitter.name === "PageTypeDispatcher"
    ? PageTypeDispatcher({
        defaults: loadedLayout.defaults,
        byPageType: loadedLayout.byPageType,
      })
    : emitter,
)

export default config
export const layout = loadedLayout
