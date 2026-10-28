import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'
import { normalizePostId } from './utils/blog'

const person = z.object({
  name: z.string().trim().min(1),
  type: z.enum(['Person', 'Organization']).default('Person'),
  url: z.url({ protocol: /^https?$/ }).optional(),
})

const blog = defineCollection({
  loader: glob({
    base: './src/content/blog',
    pattern: '**/*.{md,mdx}',
    generateId: ({ entry, data }) =>
      normalizePostId(String(data.slug ?? entry.replace(/\.(md|mdx)$/, ''))),
  }),
  schema: ({ image }) =>
    z
      .object({
        contentKind: z.enum(['original', 'translation']).default('original'),
        author: person.optional(),
        translator: person.optional(),
        source: z
          .object({
            title: z.string().trim().min(1),
            url: z.url({ protocol: /^https?$/ }),
            publishedDate: z.coerce.date(),
            author: person.optional(),
          })
          .optional(),
        title: z.string().min(1),
        description: z.string().min(1),
        pubDate: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        category: z.string().min(1).default('技术'),
        tags: z.array(z.string().min(1)).default([]),
        draft: z.boolean().default(false),
        slug: z.string().min(1).optional(),
        coverImage: z.object({ src: image(), alt: z.string().min(1) }).optional(),
        ogImage: z.string().optional(),
      })
      .superRefine((data, ctx) => {
        if (data.contentKind === 'translation' && !data.source)
          ctx.addIssue({ code: 'custom', message: 'Translation requires source', path: ['source'] })
        if (data.contentKind === 'original' && (data.source || data.translator))
          ctx.addIssue({
            code: 'custom',
            message: 'Original content cannot declare translation metadata',
          })
      }),
})

export const collections = { blog }
