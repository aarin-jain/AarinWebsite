import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { posts } from "../../../../../db/schema";
import { buildPostUpdate, isUniqueConstraintError, parsePostId, readPostMutationInput } from "../../../../../domain/posts";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const id = parsePostId((await params).id);
  if (id === null) return Response.json({ error: "Invalid post ID." }, { status: 400 });

  try {
    const [post] = await getDb().select().from(posts).where(eq(posts.id, id)).limit(1);
    if (!post) return Response.json({ error: "Post not found." }, { status: 404 });
    return Response.json({ post });
  } catch {
    return Response.json({ error: "Unable to load this article." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const id = parsePostId((await params).id);
  if (id === null) return Response.json({ error: "Invalid post ID." }, { status: 400 });

  try {
    const body = await readPostMutationInput(request);
    if (!body.ok) return Response.json({ error: body.error }, { status: 400 });
    const [existing] = await getDb().select().from(posts).where(eq(posts.id, id)).limit(1);
    if (!existing) return Response.json({ error: "Post not found." }, { status: 404 });

    const update = buildPostUpdate(existing, body.value, new Date().toISOString());
    if (!update.ok) return Response.json({ error: update.error }, { status: 400 });

    const [post] = await getDb().update(posts).set(update.value).where(eq(posts.id, id)).returning();
    return Response.json({ post });
  } catch (error) {
    if (isUniqueConstraintError(error)) return Response.json({ error: "An article already uses this URL." }, { status: 409 });
    return Response.json({ error: "Unable to update this article." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const id = parsePostId((await params).id);
  if (id === null) return Response.json({ error: "Invalid post ID." }, { status: 400 });

  try {
    const [deleted] = await getDb().delete(posts).where(eq(posts.id, id)).returning({ id: posts.id });
    if (!deleted) return Response.json({ error: "Post not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Unable to delete this article." }, { status: 500 });
  }
}
