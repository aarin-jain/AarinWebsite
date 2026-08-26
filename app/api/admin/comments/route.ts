import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { articleComments, posts } from "../../../../db/schema";

export async function GET() {
  try {
    const comments = await getDb().select({
      id: articleComments.id,
      publicId: articleComments.publicId,
      parentId: articleComments.parentId,
      name: articleComments.name,
      email: articleComments.email,
      body: articleComments.body,
      createdAt: articleComments.createdAt,
      postTitle: posts.title,
      postSlug: posts.slug,
    }).from(articleComments).innerJoin(posts, eq(articleComments.postId, posts.id)).orderBy(desc(articleComments.createdAt), desc(articleComments.id));
    return Response.json({ comments });
  } catch { return Response.json({ error: "Unable to load comments." }, { status: 500 }); }
}
