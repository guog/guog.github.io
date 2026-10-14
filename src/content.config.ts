import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { normalizePostId } from "./utils/blog";

const blog = defineCollection({
  loader: glob({
    base: "./src/content/blog",
    pattern: "**/*.{md,mdx}",
    generateId: ({ entry, data }) =>
      normalizePostId(String(data.slug ?? entry.replace(/\.(md|mdx)$/, ""))),
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      category: z.string().min(1).default("技术"),
      tags: z.array(z.string().min(1)).default([]),
      draft: z.boolean().default(false),
      slug: z.string().min(1).optional(),
      coverImage: z.object({ src: image(), alt: z.string().min(1) }).optional(),
      ogImage: z.string().optional(),
    }),
});

export const collections = { blog };
