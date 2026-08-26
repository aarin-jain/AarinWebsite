import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { posts } from "../db/schema";

export async function publishedPost(slug: string) {
  const [post] = await getDb().select().from(posts).where(and(eq(posts.slug, slug), eq(posts.status, "published"))).limit(1);
  return post ?? null;
}

export async function enforceRateLimit(db: D1Database, key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresIso = new Date(now.getTime() + windowMs).toISOString();
  const row = await db.prepare(`
    INSERT INTO engagement_rate_limits (key, count, expires_at)
    VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET
      count = CASE WHEN expires_at <= ? THEN 1 ELSE count + 1 END,
      expires_at = CASE WHEN expires_at <= ? THEN excluded.expires_at ELSE expires_at END
    RETURNING count
  `).bind(key, expiresIso, nowIso, nowIso).first<{ count: number }>();
  return Boolean(row && row.count <= limit);
}
