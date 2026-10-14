import { getCollection } from "astro:content";

export async function getPublishedPosts() {
  return (await getCollection("blog", ({ data }) => !data.draft)).sort(
    (a, b) =>
      b.data.pubDate.valueOf() - a.data.pubDate.valueOf() || a.id.localeCompare(b.id, "zh-CN"),
  );
}
