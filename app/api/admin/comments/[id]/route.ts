import { env } from "cloudflare:workers";
import { parsePostId } from "../../../../../domain/posts";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Context) {
  const id = parsePostId((await params).id);
  if (id === null) return Response.json({ error: "Invalid comment ID." }, { status: 400 });
  try {
    const existing = await env.DB.prepare("SELECT id FROM article_comments WHERE id = ?").bind(id).first();
    if (!existing) return Response.json({ error: "Comment not found." }, { status: 404 });
    await env.DB.prepare(`
      WITH RECURSIVE descendants(id) AS (
        SELECT id FROM article_comments WHERE id = ?
        UNION ALL
        SELECT child.id FROM article_comments child JOIN descendants parent ON child.parent_id = parent.id
      )
      DELETE FROM article_comments WHERE id IN (SELECT id FROM descendants)
    `).bind(id).run();
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "Unable to delete this comment." }, { status: 500 }); }
}
