/** Compare legacy links by heading, hierarchy and the complete section's content. */
import { createHash } from 'node:crypto'
import { codeBlocks, findAll, textContent } from '../integrations/markdown.mjs'
const depth = (node) => (/^h[1-6]$/.test(node.tagName ?? '') ? Number(node.tagName[1]) : 7)
const normalize = (value) => value.replace(/\s+/g, ' ').trim()
// Exclude renderer boilerplate; identity belongs to content, not generated CSS or line numbers.
function sectionText(node) {
  if (node.type === 'text') return node.value
  if (
    ['script', 'style', 'button'].includes(node.tagName) ||
    [true, 'true'].includes(node.properties?.ariaHidden) ||
    node.properties?.dataMarkdownExclude !== undefined
  )
    return ''
  if (node.tagName === 'pre') return codeBlocks(node)[0].value
  if (node.tagName === 'img') return String(node.properties?.alt ?? '')
  return (node.children ?? []).map(sectionText).join(' ')
}
export function headingSections(body) {
  const children = body.children ?? []
  const ancestors = []
  return children.flatMap((node, index) => {
    if (depth(node) > 4 || !node.properties?.id) return []
    while (ancestors.length && ancestors.at(-1).depth >= depth(node)) ancestors.pop()
    const section = []
    for (const following of children.slice(index + 1)) {
      if (depth(following) <= depth(node)) break
      if (depth(following) === 7) section.push(sectionText(following))
    }
    const content = normalize(section.join(' '))
    const record = {
      id: node.properties.id,
      text: textContent(node),
      depth: depth(node),
      ancestors: ancestors.map(({ id }) => id),
      following: content.slice(0, 100),
      contentHash: createHash('sha256').update(content).digest('hex'),
    }
    ancestors.push(record)
    return [record]
  })
}
const emptyAlias = (node) =>
  node.tagName === 'a' &&
  typeof node.properties?.id === 'string' &&
  !node.properties.href &&
  !textContent(node).trim()
const aliasContainer = (node) =>
  node.type === 'text'
    ? !node.value.trim()
    : emptyAlias(node) || (node.tagName === 'p' && (node.children ?? []).every(aliasContainer))

export function assertLegacyHeadings(body, expected) {
  const sections = headingSections(body)
  const allIDs = findAll(body, (node) => typeof node.properties?.id === 'string')
  const resolved = new Map()
  for (const legacy of expected) {
    const matching = allIDs.filter((node) => node.properties.id === legacy.id)
    if (matching.length !== 1)
      throw new Error(`Legacy #${legacy.id}: expected one ID, found ${matching.length}`)
    let section = sections.find((section) => section.id === legacy.id)
    let explicitAlias = false
    if (!section && emptyAlias(matching[0])) {
      const index = body.children.findIndex(
        (child) => findAll(child, (node) => node === matching[0]).length,
      )
      if (index >= 0 && aliasContainer(body.children[index])) {
        for (const next of body.children.slice(index + 1)) {
          if (aliasContainer(next)) continue
          section = sections.find((candidate) => candidate.id === next.properties?.id)
          break
        }
        explicitAlias = Boolean(section)
      }
    }
    if (
      !section ||
      section.depth !== legacy.depth ||
      (!explicitAlias && section.text !== legacy.text) ||
      section.contentHash !== legacy.contentHash
    )
      throw new Error(
        `Legacy #${legacy.id}: heading identity changed; review title, depth, full section content and explicit alias`,
      )
    resolved.set(legacy.id, section)
  }
  for (const legacy of expected) {
    const section = resolved.get(legacy.id)
    const ancestorIDs = legacy.ancestors.map((id) => resolved.get(id)?.id ?? id)
    if (JSON.stringify(section.ancestors) !== JSON.stringify(ancestorIDs))
      throw new Error(`Legacy #${legacy.id}: ancestor context changed`)
  }
}
