import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('https://giscus.app/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* isolated */' }),
  )
})

test('compact masthead folds source details and keeps correct machine-readable roles and dates', async ({
  page,
  request,
}) => {
  await page.goto('/blog/the-ai-native-sdlc-playbook/')
  const json = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
  )
  expect(json.author.name).toBe('Louis Claxton')
  expect(json.translator.name).toBe('guog')
  expect(json.translationOfWork.datePublished).toBe('2026-08-21T00:00:00.000Z')
  expect(json.datePublished).toBe('2026-09-04T00:00:00.000Z')
  expect(json.dateModified).toBe('2026-09-15T00:00:00.000Z')
  const info = page.locator('.article-info')
  await expect(info).not.toHaveAttribute('open')
  await expect(info.locator('summary')).toHaveText('2026-09-04 / 66 min read · Article info')
  await expect(info.getByRole('link')).toBeHidden()
  await expect(page.locator('[data-attribution]')).toBeHidden()
  await expect(page.locator('body')).not.toContainText('not specified')
  await info.locator('summary').focus()
  await page.keyboard.press('Enter')
  await expect(info.getByRole('link')).toBeVisible()
  await expect(info).toContainText('Louis Claxton')
  await expect(info).toContainText('2026-08-21')
  await expect(info).toContainText('Updated: 2026-09-15')
  const markdown = await (await request.get('/blog/the-ai-native-sdlc-playbook/index.md')).text()
  expect(markdown).toContain('原作者：Louis Claxton；译者：guog')
  expect(markdown).toContain(json.translationOfWork.url)
  expect(markdown).toContain('2026-09-15')
  await page.goto('/blog/__regression__/prompt-safety/')
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1)
  expect(await page.evaluate(() => (window as any).promptEscaped)).toBeUndefined()
  // Original posts without extra information have no empty disclosure.
  await expect(page.locator('.article-info')).toHaveCount(0)
})

test('heading text navigates locally and its icon copies the canonical section URL', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/blog/markdown-101/')
  const heading = page.locator('[data-article-body] h2[id]').first()
  const id = await heading.getAttribute('id')
  const button = heading.getByRole('button')
  const link = heading.locator('.section-anchor').first()
  await expect(page.locator('.section-links')).toHaveCount(0)
  await expect(button).toHaveText('')
  await expect(link).not.toHaveText('Link')
  await expect(link).toHaveCSS('text-decoration-line', 'none')
  expect(await link.evaluate((node) => getComputedStyle(node).color)).toBe(
    await heading.evaluate((node) => getComputedStyle(node).color),
  )
  await expect(button).toHaveCSS('opacity', '0')
  await button.focus()
  await expect(button).toHaveCSS('opacity', '1')
  await page.keyboard.press('Enter')
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`https://guog.github.io/blog/markdown-101/#${encodeURIComponent(id!)}`)
  await expect(page.locator('[data-section-status]')).toHaveText('Copied')
  await expect(button).toHaveAttribute('data-copied', 'true')
  await expect(button.locator('.copied-symbol')).toBeVisible()
  await link.click()
  expect(new URL(page.url()).hostname).toBe('127.0.0.1')
  expect(decodeURIComponent(new URL(page.url()).hash.slice(1))).toBe(id)
  await expect(heading).toBeInViewport()
  await expect(button).not.toHaveAttribute('data-copied')
})

for (const failure of ['rejected', 'unavailable']) {
  test(`section copy ${failure} focuses the heading link without claiming success`, async ({
    page,
  }) => {
    await page.addInitScript((mode) => {
      Object.defineProperty(navigator, 'clipboard', {
        value:
          mode === 'unavailable'
            ? undefined
            : { writeText: () => Promise.reject(new Error('denied')) },
      })
    }, failure)
    await page.goto('/blog/markdown-101/')
    const heading = page.locator('[data-article-body] h2[id]').first()
    await heading.getByRole('button').focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-section-status]')).toHaveText(
      'Copy failed. Use the heading link.',
    )
    await expect(page.locator('[data-section-status]')).toBeVisible()
    await expect(heading.locator('.section-anchor').first()).toBeFocused()
    await expect(heading.getByRole('button')).not.toHaveAttribute('data-copied')
  })
}

test('section icons stay discoverable on touch screens', async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 375, height: 900 },
  })
  const page = await context.newPage()
  await page.route('https://giscus.app/**', (route) => route.abort())
  await page.goto('/blog/the-ai-native-sdlc-playbook/')
  const button = page.locator('.section-copy').first()
  await expect(button).toHaveCSS('opacity', '1')
  await expect(button).toHaveAccessibleName(/^Copy link to /)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await context.close()
})

test('heading links preserve code, emphasis, authored links and duplicate heading IDs', async ({
  page,
}) => {
  await page.goto('/blog/__regression__/prompt-safety/')
  const headings = page.locator('[data-article-body] h3[id]')
  await expect(headings).toHaveCount(2)
  const first = headings.first()
  await expect(first.locator('code')).toHaveText('code')
  await expect(first.locator('em')).toHaveText('强调')
  await expect(first.locator('a[href="/blog/markdown-101/"]')).toHaveText('原有链接')
  await expect(first.locator('a a')).toHaveCount(0)
  await expect(first).toHaveAccessibleName('含 code、强调与原有链接的标题')
  const ids = await headings.evaluateAll((nodes) => nodes.map((node) => node.id))
  expect(new Set(ids).size).toBe(2)
  for (const heading of await headings.all()) {
    const id = await heading.getAttribute('id')
    await expect(heading.locator('.section-anchor').first()).toHaveAttribute(
      'href',
      `#${encodeURIComponent(id!)}`,
    )
  }
})
