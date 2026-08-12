import { desc } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { posts } from "../../../../db/schema";

export async function GET() {
  if (!(await getChatGPTUser())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await getDb().select().from(posts).orderBy(desc(posts.updatedAt), desc(posts.id));
    return Response.json({ posts: rows });
  } catch { return Response.json({ error: "Unable to load posts." }, { status: 500 }); }
}
