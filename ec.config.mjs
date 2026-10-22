import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers'
import { defineEcConfig } from 'astro-expressive-code'

// Adapted from Cactus 8.3.0. This is the single config used by Markdown, MDX and <Code>.
export default defineEcConfig({
  plugins: [pluginLineNumbers()],
  defaultLocale: 'en-US',
  themes: ['dracula', 'github-light'],
  themeCssSelector: (theme) => `[data-theme="${theme.type}"]`,
  useThemedScrollbars: false,
  styleOverrides: {
    borderRadius: '4px',
    codeFontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Noto Sans Mono CJK SC", monospace',
    codeFontSize: '0.875rem',
    codeLineHeight: '1.7142857rem',
    codePaddingInline: '1rem',
    frames: { frameBoxShadowCssValue: 'none' },
  },
})
