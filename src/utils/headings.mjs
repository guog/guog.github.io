/** Compare legacy IDs by section identity, not merely by their presence. */
import { findAll, textContent } from '../integrations/markdown.mjs'
const depth = (node) => (/^h[1-6]$/.test(node.tagName ?? '') ? Number(node.tagName[1]) : 7)
const normalize = (value) => value.replace(/\s+/g, ' ').trim()
export function headingSections(body) {
  const children = body.children ?? []
  return children.flatMap((node, index) => {
    if (depth(node) > 4 || !node.properties?.id) return []
    const section = []
    for (const following of children.slice(index + 1)) {
      if (depth(following) <= depth(node)) break
      if (depth(following) === 7) section.push(textContent(following))
    }
    return [
      {
        id: node.properties.id,
        text: textContent(node),
        following: normalize(section.join(' ')).slice(0, 100),
      },
    ]
  })
}
export function assertLegacyHeadings(body, expected) {
  const sections = headingSections(body)
  const allIDs = findAll(body, (node) => typeof node.properties?.id === 'string')
  for (const legacy of expected) {
    const matching = allIDs.filter((node) => node.properties.id === legacy.id)
    if (matching.length !== 1)
      throw new Error(`Legacy #${legacy.id}: expected one ID, found ${matching.length}`)
    let section = sections.find((section) => section.id === legacy.id)
    if (!section) {
      // A deliberate title change may keep its former ID on an adjacent alias anchor.
      const index = body.children.indexOf(matching[0])
      const next = body.children.slice(index + 1).find((node) => node.type === 'element')
      section = sections.find((section) => section.id === next?.properties?.id)
    }
    if (!section || section.following !== legacy.following)
      throw new Error(
        `Legacy #${legacy.id}: section moved or content identity changed; review the alias/section mapping`,
      )
  }
}
