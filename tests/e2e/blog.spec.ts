import { expect, type Page, test } from '@playwright/test'
import { siteConfig } from '../../src/site.config'

const fixtureURL = '/blog/__regression__/nested/MixedCase/'
const chineseURL = '/blog/__regression__/%E4%B8%AD%E6%96%87%E8%B7%AF%E5%BE%84/'
const explicitURL = '/blog/__regression__/Custom/%E6%98%BE%E5%BC%8F%E8%B7%AF%E5%BE%84/'
const articleURL = '/blog/modern-se/'
const corePages = [
  '/',
  '/blog/',
  '/search/',
  '/tags/',
  '/tags/CI/CD/',
  articleURL,
  '/blog/markdown-101/',
  '/blog/the-ai-native-sdlc-playbook/',
  fixtureURL,
]

async function noPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }))
  expect(dimensions.document, JSON.stringify(dimensions)).toBeLessThanOrEqual(
    dimensions.viewport + 1,
  )
  expect(dimensions.body, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport + 1)
}

// Local behavior must stay deterministic and independent of third-party availability.
test.beforeEach(async ({ page }) => {
  await page.route('https://giscus.app/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: '/* Giscus is isolated in local regression tests. */',
    }),
  )
})

for (const width of [375, 768, 1440]) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${width}px ${theme}: Chinese pages, keyboard controls, and layout screenshots`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ colorScheme: theme })
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      for (const [index, route] of corePages.entries()) {
        const response = await page.goto(route)
        expect(response?.status(), route).toBe(200)
        await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        if (route === '/') {
          await expect(page.locator('h1')).toHaveCount(0)
          await expect(page.locator('main > section').first()).toHaveText(siteConfig.description)
          const more = page.getByRole('heading', { level: 2, name: 'More...', exact: true })
          await expect(more).toBeVisible()
          await expect(more.getByRole('link')).toHaveAttribute('href', '/blog/')
          const posts = page.locator('main ul[role="list"] > li')
          expect(await posts.count()).toBeGreaterThan(0)
          expect(await posts.count()).toBeLessThanOrEqual(10)
          for (const post of await posts.all()) {
            const link = post.getByRole('link')
            await expect(link).toBeVisible()
            await expect(link).toHaveAttribute('href', /^\/blog\/[^?#]+\/$/)
          }
        } else {
          await expect(page.locator('h1')).toHaveCount(1)
          await expect(page.locator('h1')).toBeVisible()
        }
        const brand = page.locator('#main-header > a')
        await expect(brand).toHaveAccessibleName(siteConfig.title)
        await expect(brand).toHaveAttribute('href', '/')
        await expect(brand.locator('img')).toHaveCount(0)
        await noPageOverflow(page)
        await page.screenshot({
          path: testInfo.outputPath(`${index}-${width}-${theme}.png`),
          fullPage: true,
          animations: 'disabled',
        })
      }
      await page.locator('#theme-toggle').focus()
      await page.keyboard.press('Space')
      await expect(page.locator('html')).toHaveAttribute(
        'data-theme',
        theme === 'light' ? 'dark' : 'light',
      )
      expect(errors).toEqual([])
    })
  }
}

test('Chinese Pagefind UI returns an existing article and navigates to it', async ({ page }) => {
  await page.goto('/search/')
  const search = page.getByRole('textbox', { name: 'Search posts', exact: true })
  await expect(search).toBeVisible()
  await search.fill('工程')
  const result = page.locator('.pagefind-ui__result-link[href*="/blog/modern-se/"]')
  await expect(result.first()).toBeVisible()
  await result.first().click()
  await expect(page).toHaveURL(/\/blog\/modern-se\/(?:#.*)?$/)
  await expect(page.locator('h1')).toContainText('现代软件工程与研发交付工具链')
})

test('drafts stay absent from generated routes, listing, feeds, sitemap and Pagefind', async ({
  page,
  request,
}) => {
  const draftResponse = await request.get('/blog/__regression__/draft/')
  expect(draftResponse.status()).toBe(404)
  for (const route of ['/', '/blog/', '/rss.xml', '/sitemap-0.xml']) {
    const response = await request.get(route)
    expect(await response.text()).not.toContain('DraftInvisibleSentinel')
    expect(await response.text()).not.toContain('/blog/__regression__/draft/')
  }
  await page.goto('/search/')
  const search = page.getByRole('textbox', { name: 'Search posts', exact: true })
  await expect(search).toBeVisible()
  await search.fill('"DraftInvisibleSentinel"')
  await expect(page.locator('.pagefind-ui__message')).toContainText('No results')
  await expect(page.locator('.pagefind-ui__result')).toHaveCount(0)
})

test('nested case-sensitive, Chinese and explicit-slug article URLs are consistent everywhere', async ({
  page,
  request,
}) => {
  const rss = await (await request.get('/rss.xml')).text()
  const sitemap = await (await request.get('/sitemap-0.xml')).text()
  for (const route of [fixtureURL, chineseURL, explicitURL, '/blog/__regression__/Caf%C3%A9/']) {
    const response = await page.goto(route)
    expect(response?.status()).toBe(200)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://guog.github.io${route}`,
    )
    expect(rss).toContain(`https://guog.github.io${route}`)
    expect(sitemap).toContain(`https://guog.github.io${route}`)
    await page.goto('/blog/')
    await expect(page.locator(`a[href="${route}"]`).first()).toBeVisible()
  }
  await page.goto('/search/')
  const search = page.getByRole('textbox', { name: 'Search posts', exact: true })
  await expect(search).toBeVisible()
  await search.fill('中文路径')
  const chineseResult = page
    .locator('.pagefind-ui__result-link')
    .filter({ hasText: '中文路径回归测试' })
    .first()
  await expect(chineseResult).toBeVisible()
  expect(new URL((await chineseResult.getAttribute('href')) ?? '', page.url()).pathname).toBe(
    chineseURL,
  )
  await chineseResult.click()
  expect(new URL(page.url()).pathname).toBe(chineseURL)
})

test('MDX, default/hidden/offset line numbers, highlighting and copy are rendered', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto(fixtureURL)
  await expect(page.getByTestId('mdx-proof')).toHaveText('MDX 运算结果：42')
  const example = page
    .locator('.expressive-code')
    .filter({ has: page.locator('.title', { hasText: 'example.ts' }) })
  await expect(example.locator('.ln')).toHaveText(['1', '2', '3'])
  await expect(example.locator('.ec-line.highlight')).toHaveCount(1)
  const hidden = page
    .locator('.expressive-code')
    .filter({ has: page.locator('.title', { hasText: 'commands.sh' }) })
  await expect(hidden.locator('.ln')).toHaveCount(0)
  const offset = page
    .locator('.expressive-code')
    .filter({ has: page.locator('.title', { hasText: 'offset.py' }) })
  await expect(offset.locator('.ln')).toHaveText(['42', '43'])
  const component = page
    .locator('.expressive-code')
    .filter({ has: page.locator('.title', { hasText: 'component.ts' }) })
  await expect(component.locator('.ln')).toHaveText(['1', '2'])
  await example.locator('.copy button').click()
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`function greet(name: string): string {\n  return \`你好，\${name}\`;\n}`)
  await offset.locator('.copy button').click()
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('def greet(name: str) -> str:\n    return f"你好，{name}"')
})

test('long code and tables scroll independently on a 375px screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(fixtureURL)
  const code = page
    .locator('.expressive-code')
    .filter({ has: page.locator('.title', { hasText: 'long-line.ts' }) })
    .locator('pre')
  expect(await code.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true)
  await code.evaluate((element) => {
    element.scrollLeft = 180
  })
  expect(await code.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)
  const table = page.locator('.prose table')
  await expect(table).toBeVisible()
  expect(
    await table.evaluate((element) => {
      let current: Element | null = element
      while (current && current !== document.body) {
        if (
          current.scrollWidth > current.clientWidth &&
          ['auto', 'scroll'].includes(getComputedStyle(current).overflowX)
        )
          return true
        current = current.parentElement
      }
      return false
    }),
  ).toBe(true)
  await noPageOverflow(page)
})

test('Chinese TOC anchors navigate to real headings; categories and tags work', async ({
  page,
}) => {
  await page.goto(fixtureURL)
  const toc = page.getByRole('navigation', { name: 'Table of Contents' })
  const link = toc.getByRole('link', { name: '长代码与表格', exact: true })
  const href = await link.getAttribute('href')
  expect(href).toBeTruthy()
  await link.click()
  expect(decodeURIComponent(new URL(page.url()).hash)).toBe(decodeURIComponent(href ?? ''))
  const heading = page.getByRole('heading', { name: '长代码与表格', exact: true })
  await expect(heading).toBeInViewport()
  await page.goto('/blog/#category-%E6%8A%80%E6%9C%AF')
  await expect(page.locator('[id="category-技术"]')).toBeInViewport()
  await page.goto('/blog/#tag-Markdown')
  await expect(page.locator('[id="tag-Markdown"]')).toBeInViewport()
  await page.locator('[id="tag-Markdown"]').click()
  await expect(page).toHaveURL(/\/tags\/Markdown\/$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Posts about Markdown')
  await page.goto('/tags/CI/CD/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Posts about CI/CD')
  await expect(page.locator('main a[href="/blog/modern-se/"]')).toBeVisible()
  await page.goto('/tags/%E8%BD%AF%E4%BB%B6%E5%B7%A5%E7%A8%8B/')
  await expect(page.locator('main a[href^="/blog/"]')).toHaveCount(3)
})

test('theme follows system, persists manual choice across navigation and refresh, and responds to provider preference changes', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-checked', 'true')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.locator('#theme-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark')
  await page.goto(articleURL)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.evaluate(() => {
    document.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: 'system' } }))
  })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull()
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)
})

test('theme gracefully follows system when browser storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Storage denied', 'SecurityError')
      },
    })
  })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.locator('#theme-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('Giscus keeps legacy pathname mapping and synchronizes mocked iframe themes', async ({
  page,
}) => {
  await page.unroute('https://giscus.app/**')
  await page.route('https://giscus.app/client.js', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `const frame = document.createElement('iframe'); frame.className = 'giscus-frame'; frame.src = 'https://giscus.app/regression-frame'; document.querySelector('.giscus').appendChild(frame);`,
    }),
  )
  await page.route('https://giscus.app/regression-frame', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<html><body>Mock comments<script>addEventListener('message', event => { if (event.data?.giscus?.setConfig) parent.postMessage({regressionTheme: event.data.giscus.setConfig.theme}, '*'); });</script></body></html>`,
    }),
  )
  await page.addInitScript(() => {
    ;(window as Window & { regressionThemes?: string[] }).regressionThemes = []
    window.addEventListener('message', (event) => {
      if (event.origin === 'https://giscus.app' && event.data?.regressionTheme)
        (window as Window & { regressionThemes?: string[] }).regressionThemes?.push(
          event.data.regressionTheme,
        )
    })
  })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto(articleURL)
  const script = page.locator('.giscus script')
  for (const [attribute, value] of Object.entries({
    'data-repo': 'guog/guog.github.io',
    'data-repo-id': 'R_kgDOVIqxYA',
    'data-category': 'General',
    'data-category-id': 'DIC_kwDOVIqxYM4DIZa2',
    'data-mapping': 'pathname',
    'data-lang': 'zh-CN',
    'data-theme': 'light',
  }))
    await expect(script).toHaveAttribute(attribute, value)
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as Window & { regressionThemes?: string[] }).regressionThemes?.at(-1),
      ),
    )
    .toBe('light')
  await page.locator('#theme-toggle').click()
  await expect(script).toHaveAttribute('data-theme', 'dark')
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as Window & { regressionThemes?: string[] }).regressionThemes?.at(-1),
      ),
    )
    .toBe('dark')
  await page.evaluate(() => {
    document.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: 'system' } }))
  })
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as Window & { regressionThemes?: string[] }).regressionThemes?.at(-1),
      ),
    )
    .toBe('light')
})

test('optional live Giscus service check is separate from local functionality', async ({
  page,
}) => {
  test.skip(
    !process.env.CHECK_LIVE_GISCUS,
    'Set CHECK_LIVE_GISCUS=1 to check live third-party availability.',
  )
  await page.unroute('https://giscus.app/**')
  const responsePromise = page.waitForResponse('https://giscus.app/client.js')
  await page.goto(articleURL)
  expect((await responsePromise).ok()).toBe(true)
  await expect(page.locator('.giscus iframe.giscus-frame')).toBeVisible({ timeout: 20_000 })
})

for (const width of [375, 1440]) {
  test(`${width}px: English navigation and accessible mobile menu`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    const menu = page.getByRole('navigation', { name: 'Main', exact: true })
    const toggle = page.locator('#toggle-navigation-menu')
    if (width < 640) {
      await expect(menu).toBeHidden()
      await toggle.focus()
      await page.keyboard.press('Enter')
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')
      await expect(menu).toBeVisible()
      await menu.getByRole('link', { name: 'Blog', exact: true }).focus()
      await page.keyboard.press('Escape')
      await expect(menu).toBeHidden()
      await expect(toggle).toBeFocused()
      await toggle.click()
    }
    await expect(menu.getByRole('link')).toHaveText(['Home', 'Blog'])
    await expect(page.getByRole('link', { name: 'Notes', exact: true })).toHaveCount(0)
    await menu.getByRole('link', { name: 'Blog', exact: true }).click()
    await expect(page).toHaveURL(/\/blog\/$/)
    await expect(page.getByRole('heading', { name: 'Posts', exact: true })).toBeVisible()
    if (width < 640) await expect(menu).toBeHidden()
    await noPageOverflow(page)
  })

  test(`${width}px: search modal finds Chinese posts, closes and returns focus`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    const trigger = page.locator('pagefind-modal-trigger button')
    await expect(trigger).toHaveAttribute('aria-label', 'search')
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const input = dialog.locator('input[type="search"]')
    await expect(input).toBeFocused()
    await expect(input).toHaveAttribute('placeholder', 'Search')
    await input.fill('工程')
    const result = dialog.locator('a[href*="/blog/modern-se/"]').first()
    await expect(result).toBeVisible()
    await noPageOverflow(page)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
    await trigger.click()
    await expect(dialog).toBeVisible()
    await dialog.locator('input[type="search"]').fill('工程')
    await dialog.locator('a[href*="/blog/modern-se/"]').first().click()
    await expect(page).toHaveURL(/\/blog\/modern-se\/(?:#.*)?$/)
  })
}

test('TOC uses upstream responsive placement and back to top respects reduced motion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(articleURL)
  const toc = page.getByRole('navigation', { name: 'Table of Contents' })
  const details = page.locator('details').filter({ has: toc })
  expect(await details.evaluate((el) => getComputedStyle(el).position)).toBe('sticky')
  const content = page.locator('.prose')
  const tocBox = await details.boundingBox()
  const contentBox = await content.boundingBox()
  expect(tocBox!.x).toBeGreaterThan(contentBox!.x)
  await content.locator('h2').last().scrollIntoViewIfNeeded()
  const top = page.getByRole('button', { name: 'Back to top', exact: true })
  await expect(top).toBeVisible()
  await top.click()
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
  await page.setViewportSize({ width: 375, height: 900 })
  expect(await details.evaluate((el) => getComputedStyle(el).position)).toBe('static')
  expect((await details.boundingBox())!.y).toBeLessThan((await content.boundingBox())!.y)
})
