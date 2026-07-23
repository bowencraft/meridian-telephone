import YAML from "yaml"
import type { Root } from "mdast"
import type { VFile } from "vfile"
import type { QuartzTransformerPlugin } from "../types"

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/

/**
 * Quartz 5's current plugin baseline does not populate vfile.data.frontmatter.
 * The handbook needs it for explicit publication, titles, surfaces, and dates.
 */
export const HandbookFrontmatter: QuartzTransformerPlugin = () => ({
  name: "HandbookFrontmatter",
  markdownPlugins() {
    return [
      () => (tree: Root, file: VFile) => {
        const source = String(file.value)
        const match = source.match(FRONTMATTER)
        if (!match) return

        const parsed = YAML.parse(match[1])
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error(`Invalid YAML frontmatter in ${file.path}`)
        }

        file.data.frontmatter = parsed

        // Without a frontmatter syntax extension, remark parses the opening
        // delimiter as a thematic break and the body as a setext heading.
        // Remove every AST node covered by the matched frontmatter range.
        tree.children = tree.children.filter(
          (node) => (node.position?.start.offset ?? match[0].length) >= match[0].length,
        )
      },
    ]
  },
})
