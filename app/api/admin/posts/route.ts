import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { posts } from "../../../../db/schema";
import { isUniqueConstraintError, normalizeNewPostInput, readPostMutationInput } from "../../../../domain/posts";

export async function GET() {
  try {
    const rows = await getDb().select({
      id: posts.id, title: posts.title, slug: posts.slug, excerpt: posts.excerpt, content: posts.content,
      status: posts.status, authorId: posts.authorId, publishedAt: posts.publishedAt, createdAt: posts.createdAt,
      updatedAt: posts.updatedAt, commentsEnabled: posts.commentsEnabled,
      likeCount: sql<number>`(SELECT COUNT(*) FROM article_likes WHERE article_likes.post_id = ${posts.id})`,
      commentCount: sql<number>`(SELECT COUNT(*) FROM article_comments WHERE article_comments.post_id = ${posts.id})`,
    }).from(posts).orderBy(desc(posts.updatedAt), desc(posts.id));
    return Response.json({ posts: rows });
  } catch { return Response.json({ error: "Unable to load posts." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const body = await readPostMutationInput(request);
    if (!body.ok) return Response.json({ error: body.error }, { status: 400 });
    const normalized = normalizeNewPostInput(body.value);
    if (!normalized.ok) return Response.json({ error: normalized.error }, { status: 400 });

    const { title, excerpt, content, status, commentsEnabled } = normalized.value;
    const slug = await uniqueSlug(title);
    const now = new Date().toISOString();
    const [post] = await getDb().insert(posts).values({
      title,
      slug,
      excerpt,
      content,
      status,
      authorId: "aarin",
      publishedAt: status === "published" ? now : null,
      updatedAt: now,
      commentsEnabled,
    }).returning();
    return Response.json({ post }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return Response.json({ error: "An article already uses this URL. Please try a different title." }, { status: 409 });
    }
    return Response.json({ error: "Unable to save this article." }, { status: 500 });
  }
}

async function uniqueSlug(title: string) {
  const base = title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 70) || "untitled";
  let slug = base;
  let suffix = 2;
  while ((await getDb().select({ id: posts.id }).from(posts).where(eq(posts.slug, slug)).limit(1)).length) slug = `${base}-${suffix++}`;
  return slug;
}
