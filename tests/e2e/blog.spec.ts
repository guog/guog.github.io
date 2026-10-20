import { expect, type Page, test } from "@playwright/test";

const fixtureURL = "/blog/__regression__/nested/MixedCase/";
const chineseURL = "/blog/__regression__/%E4%B8%AD%E6%96%87%E8%B7%AF%E5%BE%84/";
const explicitURL = "/blog/__regression__/Custom/%E6%98%BE%E5%BC%8F%E8%B7%AF%E5%BE%84/";
const articleURL = "/blog/modern-se/";
const corePages = [
  "/",
  "/blog/",
  "/search/",
  "/about/",
  articleURL,
  "/blog/markdown-101/",
  "/blog/the-ai-native-sdlc-playbook/",
  fixtureURL,
];

async function noPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.document, JSON.stringify(dimensions)).toBeLessThanOrEqual(
    dimensions.viewport + 1,
  );
  expect(dimensions.body, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport + 1);
}

// Local behavior must stay deterministic and independent of third-party availability.
test.beforeEach(async ({ page }) => {
  await page.route("https://giscus.app/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "/* Giscus is isolated in local regression tests. */",
    }),
  );
});

for (const width of [375, 768, 1440]) {
  for (const theme of ["light", "dark"] as const) {
    test(`${width}px ${theme}: Chinese pages, keyboard controls, and layout screenshots`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const [index, route] of corePages.entries()) {
        const response = await page.goto(route);
        expect(response?.status(), route).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page.locator("h1")).toHaveCount(1);
        await expect(page.locator("h1")).toBeVisible();
        await noPageOverflow(page);
        await page.screenshot({
          path: testInfo.outputPath(`${index}-${width}-${theme}.png`),
          fullPage: true,
          animations: "disabled",
        });
      }
      await page.locator("#theme-toggle").focus();
      await page.keyboard.press("Space");
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        theme === "light" ? "dark" : "light",
      );
      expect(errors).toEqual([]);
    });
  }
}

test("Chinese Pagefind UI returns an existing article and navigates to it", async ({ page }) => {
  await page.goto("/search/");
  const search = page.getByRole("textbox", { name: "搜索文章", exact: true });
  await expect(search).toBeVisible();
  await search.fill("工程");
  const result = page.locator('.pagefind-ui__result-link[href*="/blog/modern-se/"]');
  await expect(result.first()).toBeVisible();
  await result.first().click();
  await expect(page).toHaveURL(/\/blog\/modern-se\/(?:#.*)?$/);
  await expect(page.locator("h1")).toContainText("现代软件工程与研发交付工具链");
});

test("drafts stay absent from generated routes, listing, feeds, sitemap and Pagefind", async ({
  page,
  request,
}) => {
  const draftResponse = await request.get("/blog/__regression__/draft/");
  expect(draftResponse.status()).toBe(404);
  for (const route of ["/", "/blog/", "/rss.xml", "/sitemap-0.xml"]) {
    const response = await request.get(route);
    expect(await response.text()).not.toContain("DraftInvisibleSentinel");
    expect(await response.text()).not.toContain("/blog/__regression__/draft/");
  }
  await page.goto("/search/");
  const search = page.getByRole("textbox", { name: "搜索文章", exact: true });
  await expect(search).toBeVisible();
  await search.fill('"DraftInvisibleSentinel"');
  await expect(page.locator(".pagefind-ui__message")).toContainText("没有找到");
  await expect(page.locator(".pagefind-ui__result")).toHaveCount(0);
});

test("nested case-sensitive, Chinese and explicit-slug article URLs are consistent everywhere", async ({
  page,
  request,
}) => {
  const rss = await (await request.get("/rss.xml")).text();
  const sitemap = await (await request.get("/sitemap-0.xml")).text();
  for (const route of [fixtureURL, chineseURL, explicitURL, "/blog/__regression__/Caf%C3%A9/"]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://guog.github.io${route}`,
    );
    expect(rss).toContain(`https://guog.github.io${route}`);
    expect(sitemap).toContain(`https://guog.github.io${route}`);
    await page.goto("/blog/");
    await expect(page.locator(`a[href="${route}"]`).first()).toBeVisible();
  }
  await page.goto("/search/");
  const search = page.getByRole("textbox", { name: "搜索文章", exact: true });
  await expect(search).toBeVisible();
  await search.fill("中文路径");
  const chineseResult = page
    .locator(".pagefind-ui__result-link")
    .filter({ hasText: "中文路径回归测试" })
    .first();
  await expect(chineseResult).toBeVisible();
  expect(new URL((await chineseResult.getAttribute("href")) ?? "", page.url()).pathname).toBe(
    chineseURL,
  );
  await chineseResult.click();
  expect(new URL(page.url()).pathname).toBe(chineseURL);
});

test("MDX, default/hidden/offset line numbers, highlighting and copy are rendered", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(fixtureURL);
  await expect(page.getByTestId("mdx-proof")).toHaveText("MDX 运算结果：42");
  const example = page
    .locator(".expressive-code")
    .filter({ has: page.locator(".title", { hasText: "example.ts" }) });
  await expect(example.locator(".ln")).toHaveText(["1", "2", "3"]);
  await expect(example.locator(".ec-line.highlight")).toHaveCount(1);
  const hidden = page
    .locator(".expressive-code")
    .filter({ has: page.locator(".title", { hasText: "commands.sh" }) });
  await expect(hidden.locator(".ln")).toHaveCount(0);
  const offset = page
    .locator(".expressive-code")
    .filter({ has: page.locator(".title", { hasText: "offset.py" }) });
  await expect(offset.locator(".ln")).toHaveText(["42", "43"]);
  const component = page
    .locator(".expressive-code")
    .filter({ has: page.locator(".title", { hasText: "component.ts" }) });
  await expect(component.locator(".ln")).toHaveText(["1", "2"]);
  await example.locator(".copy button").click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`function greet(name: string): string {\n  return \`你好，\${name}\`;\n}`);
  await offset.locator(".copy button").click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('def greet(name: str) -> str:\n    return f"你好，{name}"');
});

test("long code and tables scroll independently on a 375px screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(fixtureURL);
  const code = page
    .locator(".expressive-code")
    .filter({ has: page.locator(".title", { hasText: "long-line.ts" }) })
    .locator("pre");
  expect(await code.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await code.evaluate((element) => {
    element.scrollLeft = 180;
  });
  expect(await code.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  const table = page.locator(".prose table");
  await expect(table).toBeVisible();
  expect(
    await table.evaluate((element) => {
      let current: Element | null = element;
      while (current && current !== document.body) {
        if (
          current.scrollWidth > current.clientWidth &&
          ["auto", "scroll"].includes(getComputedStyle(current).overflowX)
        )
          return true;
        current = current.parentElement;
      }
      return false;
    }),
  ).toBe(true);
  await noPageOverflow(page);
});

test("Chinese TOC anchors navigate to real headings; categories and tags work", async ({
  page,
}) => {
  await page.goto(fixtureURL);
  const toc = page.getByRole("navigation", { name: "文章目录" });
  const link = toc.getByRole("link", { name: "长代码与表格", exact: true });
  const href = await link.getAttribute("href");
  expect(href).toBeTruthy();
  await link.click();
  expect(decodeURIComponent(new URL(page.url()).hash)).toBe(decodeURIComponent(href ?? ""));
  const heading = page.getByRole("heading", { name: "长代码与表格", exact: true });
  await expect(heading).toBeInViewport();
  await page.goto("/blog/");
  await page
    .getByRole("navigation", { name: "文章分类" })
    .getByRole("link", { name: "技术", exact: true })
    .click();
  const categoryAnchor = decodeURIComponent(new URL(page.url()).hash.slice(1));
  expect(await page.evaluate((id) => Boolean(document.getElementById(id)), categoryAnchor)).toBe(
    true,
  );
  await page.locator(".tag-summary").getByRole("link", { name: "#Markdown", exact: true }).click();
  const tagAnchor = decodeURIComponent(new URL(page.url()).hash.slice(1));
  // The hashchange handler opens the details asynchronously after the link click.
  await expect
    .poll(() => page.evaluate((id) => document.getElementById(id)?.hasAttribute("open"), tagAnchor))
    .toBe(true);
});

test("theme follows system, persists manual choice across navigation and refresh, and resets", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("#theme-toggle")).toHaveAttribute("aria-checked", "true");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.locator("#theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("dark");
  await page.goto(articleURL);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator("#theme-system").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBeNull();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
});

test("theme gracefully follows system when browser storage is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Storage denied", "SecurityError");
      },
    });
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator("#theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("Giscus keeps legacy pathname mapping and synchronizes mocked iframe themes", async ({
  page,
}) => {
  await page.unroute("https://giscus.app/**");
  await page.route("https://giscus.app/client.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `const frame = document.createElement('iframe'); frame.className = 'giscus-frame'; frame.src = 'https://giscus.app/regression-frame'; document.querySelector('.giscus').appendChild(frame);`,
    }),
  );
  await page.route("https://giscus.app/regression-frame", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<html><body>Mock comments<script>addEventListener('message', event => { if (event.data?.giscus?.setConfig) parent.postMessage({regressionTheme: event.data.giscus.setConfig.theme}, '*'); });</script></body></html>`,
    }),
  );
  await page.addInitScript(() => {
    (window as Window & { regressionThemes?: string[] }).regressionThemes = [];
    window.addEventListener("message", (event) => {
      if (event.origin === "https://giscus.app" && event.data?.regressionTheme)
        (window as Window & { regressionThemes?: string[] }).regressionThemes?.push(
          event.data.regressionTheme,
        );
    });
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(articleURL);
  const script = page.locator(".giscus script");
  for (const [attribute, value] of Object.entries({
    "data-repo": "guog/guog.github.io",
    "data-repo-id": "R_kgDOVIqxYA",
    "data-category": "General",
    "data-category-id": "DIC_kwDOVIqxYM4DIZa2",
    "data-mapping": "pathname",
    "data-lang": "zh-CN",
    "data-theme": "light",
  }))
    await expect(script).toHaveAttribute(attribute, value);
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as Window & { regressionThemes?: string[] }).regressionThemes?.at(-1),
      ),
    )
    .toBe("light");
  await page.locator("#theme-toggle").click();
  await expect(script).toHaveAttribute("data-theme", "dark");
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as Window & { regressionThemes?: string[] }).regressionThemes?.at(-1),
      ),
    )
    .toBe("dark");
  await page.locator("#theme-system").click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as Window & { regressionThemes?: string[] }).regressionThemes?.at(-1),
      ),
    )
    .toBe("light");
});

test("optional live Giscus service check is separate from local functionality", async ({
  page,
}) => {
  test.skip(
    !process.env.CHECK_LIVE_GISCUS,
    "Set CHECK_LIVE_GISCUS=1 to check live third-party availability.",
  );
  await page.unroute("https://giscus.app/**");
  const responsePromise = page.waitForResponse("https://giscus.app/client.js");
  await page.goto(articleURL);
  expect((await responsePromise).ok()).toBe(true);
  await expect(page.locator(".giscus iframe.giscus-frame")).toBeVisible({ timeout: 20_000 });
});
