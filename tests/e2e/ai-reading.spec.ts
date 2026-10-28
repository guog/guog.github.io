import { expect, test } from '@playwright/test'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'

const article = '/blog/markdown-101/'
const fixture = '/blog/__regression__/nested/MixedCase/'
const unsafe = '/blog/__regression__/prompt-safety/'
const pages = [
  '/',
  '/blog/',
  '/tags/',
  '/tags/CI/CD/',
  '/tags/%E8%BD%AF%E4%BB%B6%E5%B7%A5%E7%A8%8B/',
  '/search/',
  '/404.html',
  article,
  fixture,
]

test.beforeEach(async ({ page }) => {
  await page.route('https://giscus.app/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* isolated */' }),
  )
})

test('public page discovery, Markdown MIME and missing URLs are real HTTP results', async ({
  page,
  request,
}) => {
  const sitemap = await (await request.get('/sitemap-0.xml')).text()
  const routes = new Set([
    ...pages,
    ...[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname),
  ])
  for (const route of routes) {
    await page.goto(route)
    const alternate = page.locator('link[rel="alternate"][type="text/markdown"]')
    await expect(alternate).toHaveCount(1)
    const expected = `https://guog.github.io${route.endsWith('/') ? `${route}index.md` : `${route}.md`}`
    await expect(alternate).toHaveAttribute('href', expected)
    await expect(page.locator('link[rel="describedby"]')).toHaveAttribute(
      'href',
      'https://guog.github.io/llms.txt',
    )
    const response = await request.get(new URL(expected).pathname)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toMatch(/^text\/(markdown|plain)/)
    expect(await response.text()).not.toMatch(/<!doctype html|<html\b/)
  }
  for (const route of [
    '/missing-page/',
    '/missing-page/index.md',
    '/about/index.md',
    '/blog/__regression__/draft/index.md',
  ])
    expect((await request.get(route)).status()).toBe(404)
  const llms = await request.get('/llms.txt')
  expect(llms.status()).toBe(200)
  expect(await llms.text()).not.toContain('/404.html.md')
})

test('MDX evaluates components and code remains byte-faithful in Markdown and browser copy', async ({
  page,
  request,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto(fixture)
  const markdown = await (await request.get(`${fixture}index.md`)).text()
  expect(markdown).toContain('MDX 运算结果：42')
  expect(markdown).not.toContain('import { Code }')
  expect(markdown).not.toContain('复制阅读提示词')
  expect(markdown).toContain('这条脚注必须保留')
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown)
  const expected =
    '42 starts here  \n\tif (a < b && c > 1) {\n\n\n  console.log("```", "&");\n}\n\n'
  expect(
    tree.children.some(
      (node) => node.type === 'code' && node.value === expected && node.lang === 'typescript',
    ),
  ).toBe(true)
  const block = page
    .locator('.expressive-code')
    .filter({ has: page.locator('.title').filter({ hasText: /^whitespace\.ts$/ }) })
  await block.locator('.copy button').click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(expected)
})

test('prompt copy waits for completion and contains the current canonical and Markdown URL', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: (value: string) =>
          new Promise<void>((resolve) => {
            ;(window as any).copiedPrompt = value
            ;(window as any).resolveCopy = resolve
          }),
      },
    })
  })
  await page.goto(article)
  const button = page.getByRole('button', { name: '复制阅读提示词', exact: true })
  await button.click()
  await expect(page.locator('.copy-status')).toBeEmpty()
  await expect(button).toBeDisabled()
  await page.evaluate(() => (window as any).resolveCopy())
  await expect(page.locator('.copy-status')).toHaveText('已复制，粘贴到你的 Agent 即可。')
  const copied = await page.evaluate(() => (window as any).copiedPrompt)
  expect(copied).toContain(`文章地址：https://guog.github.io${article}`)
  expect(copied).toContain(`Markdown 地址：https://guog.github.io${article}index.md`)
  expect(copied).toContain('Markdown：从文档语言到 AI 时代的工程基础')
})

for (const failure of ['rejected', 'unavailable'])
  test(`prompt manual fallback when clipboard is ${failure}`, async ({ page }) => {
    await page.addInitScript((mode) => {
      Object.defineProperty(navigator, 'clipboard', {
        value:
          mode === 'unavailable'
            ? undefined
            : { writeText: () => Promise.reject(new Error('denied')) },
      })
    }, failure)
    await page.goto(article)
    await page.getByRole('button', { name: '复制阅读提示词', exact: true }).click()
    await expect(page.locator('.copy-status')).toHaveText('自动复制失败，请手动复制下方提示词。')
    await expect(page.getByRole('textbox', { name: '阅读提示词' })).toBeVisible()
    await expect(page.getByRole('textbox', { name: '阅读提示词' })).toBeFocused()
  })

test('no-JS reading, escaped title and explicit unknown translator stay usable', async ({
  browser,
  page,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const noJS = await context.newPage()
  await noJS.goto(unsafe)
  await noJS.getByText('查看提示词', { exact: true }).click()
  const textarea = noJS.getByRole('textbox', { name: '阅读提示词' })
  await expect(textarea).toBeVisible()
  await expect(textarea).toHaveValue(
    /安全回归 <\/textarea><script>window.promptEscaped=false<\/script>/,
  )
  await expect(noJS.locator('.copy-prompt')).toBeHidden()
  await expect(noJS.locator('.agent-reading a')).toHaveAttribute('href', `${unsafe}index.md`)
  await expect(noJS.locator('h1')).toHaveCount(1)
  await context.close()
  await page.goto('/blog/the-ai-native-sdlc-playbook/')
  await expect(page.locator('[data-attribution]')).toContainText('Translated by not specified')
  await expect(page.locator('[data-attribution]')).toContainText('Louis Claxton')
  await expect(page.locator('[data-pagefind-meta="description"]')).toBeVisible()
  expect(await page.locator('meta[name="author"]').getAttribute('content')).toBe('Louis Claxton')
  await page.goto(unsafe)
  expect(await page.evaluate(() => (window as any).promptEscaped)).toBeUndefined()
})

test('Agent instructions do not pollute the Pagefind article index', async ({ page }) => {
  await page.goto('/search/')
  await page.getByRole('textbox', { name: 'Search posts', exact: true }).fill('"不必逐行读完"')
  await expect(page.locator('.pagefind-ui__message')).toContainText('No results')
  await expect(page.locator('.pagefind-ui__result')).toHaveCount(0)
})
