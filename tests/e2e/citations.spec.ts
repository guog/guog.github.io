import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('https://giscus.app/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* isolated */' }),
  )
})

test('article JSON-LD matches visible source attribution and stays safe for hostile title text', async ({
  page,
}) => {
  await page.goto('/blog/the-ai-native-sdlc-playbook/')
  const json = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
  )
  expect(json.author.name).toBe('Louis Claxton')
  expect(json.translator).toBeUndefined()
  expect(json.translationOfWork.datePublished).toBe('2026-08-21T00:00:00.000Z')
  expect(json.datePublished).toBe('2026-09-04T00:00:00.000Z')
  expect(json.dateModified).toBe('2026-09-15T00:00:00.000Z')
  await expect(page.locator('[data-attribution]')).toContainText(json.author.name)
  await page.goto('/blog/__regression__/prompt-safety/')
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1)
  expect(await page.evaluate(() => (window as any).promptEscaped)).toBeUndefined()
})

test('section link copies an existing canonical anchor and navigates to that section', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/blog/markdown-101/')
  const heading = page.locator('[data-article-body] h2[id]').first()
  const id = await heading.getAttribute('id')
  const button = page.locator('.section-links').first().getByRole('button')
  await button.focus()
  await page.keyboard.press('Enter')
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`https://guog.github.io/blog/markdown-101/#${encodeURIComponent(id!)}`)
  await expect(page.locator('.section-links').first().getByRole('status')).toHaveText('Copied')
  const link = page.locator('.section-links').first().getByRole('link')
  await page.goto(`/blog/markdown-101/#${encodeURIComponent(id!)}`)
  await expect(page.locator(`[id="${id}"]`)).toBeInViewport()
  expect(await link.getAttribute('href')).toContain(`#${encodeURIComponent(id!)}`)
})

test('section copy failure exposes a real link and does not claim success', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined })
  })
  await page.goto('/blog/markdown-101/')
  const controls = page.locator('.section-links').first()
  await controls.getByRole('button').click()
  await expect(controls.getByRole('status')).toHaveText('Copy failed. Use the Link above.')
  await expect(controls.getByRole('link')).toBeFocused()
})
