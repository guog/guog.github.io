/** llms.txt v2: directory pages use index.md; named files append .md. */
export function getMarkdownPath(pathname: string): string {
  if (!pathname.startsWith('/') || pathname.includes('?') || pathname.includes('#'))
    throw new Error(`Expected an absolute page pathname: ${pathname}`)
  return pathname.endsWith('/') ? `${pathname}index.md` : `${pathname}.md`
}
