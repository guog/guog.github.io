import { pluginFramesTexts } from '@expressive-code/plugin-frames'
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers'
import { defineEcConfig } from 'astro-expressive-code'

pluginFramesTexts.addLocale('zh-CN', {
  terminalWindowFallbackTitle: '终端窗口',
  copyButtonTooltip: '复制代码',
  copyButtonCopied: '已复制',
})

// Adapted from Cactus 8.3.0. This is the single config used by Markdown, MDX and <Code>.
export default defineEcConfig({
  plugins: [pluginLineNumbers()],
  defaultLocale: 'zh-CN',
  themes: ['dracula', 'github-light'],
  themeCssSelector: (theme) => `[data-theme="${theme.type}"]`,
  useThemedScrollbars: false,
  styleOverrides: {
    borderRadius: '4px',
    codeFontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Noto Sans Mono CJK SC", monospace',
    codeFontSize: '0.875rem',
    codeLineHeight: '1.75rem',
    codePaddingInline: '1rem',
    frames: { frameBoxShadowCssValue: 'none' },
  },
})
