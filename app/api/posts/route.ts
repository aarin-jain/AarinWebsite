import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { posts } from "../../../db/schema";

export async function GET() {
  try {
    const rows = await getDb().select().from(posts).where(eq(posts.status, "published")).orderBy(desc(posts.publishedAt));
    return Response.json({ posts: rows });
  } catch { return Response.json({ error: "Unable to load posts." }, { status: 500 }); }
}
