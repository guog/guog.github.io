/** Preserve source whitespace through Expressive Code's public block/renderer APIs. */
import { ExpressiveCodeBlock } from 'expressive-code'
import { createRenderer } from 'rehype-expressive-code'

export function preserveCodeBlock(input) {
  const block = new ExpressiveCodeBlock(input)
  const lines = block.getLines()
  if (lines.length) block.deleteLines(lines.map((_, index) => index))
  block.insertLines(0, input.code.split(/\r?\n/))
  return block
}
export function createMarkdownCodeBlock({ input }) {
  // The standard mdast -> hast code handler adds one terminal newline to <code>.
  // Remove that framing newline only; preserve blank lines belonging to the source.
  return preserveCodeBlock({ ...input, code: input.code.replace(/\n$/, '') })
}
export async function createPreservingRenderer(options) {
  const renderer = await createRenderer(options)
  const render = renderer.ec.render.bind(renderer.ec)
  renderer.ec.render = (input) => {
    const preserve = (block) =>
      block instanceof ExpressiveCodeBlock ? block : preserveCodeBlock(block)
    return render(Array.isArray(input) ? input.map(preserve) : preserve(input))
  }
  return renderer
}
