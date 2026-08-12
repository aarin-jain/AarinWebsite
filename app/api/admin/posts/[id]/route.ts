import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { getDb } from "../../../../../db";
import { posts } from "../../../../../db/schema";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getChatGPTUser())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json()) as { status?: string };
  if (body.status !== "draft" && body.status !== "published") return Response.json({ error: "Invalid status" }, { status: 400 });
  const [existing] = await getDb().select().from(posts).where(eq(posts.id, Number(id))).limit(1);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });
  const now = new Date().toISOString();
  await getDb().update(posts).set({ status: body.status, publishedAt: body.status === "published" ? (existing.publishedAt ?? now) : null, updatedAt: now }).where(eq(posts.id, Number(id)));
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getChatGPTUser())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await getDb().delete(posts).where(eq(posts.id, Number(id)));
  return Response.json({ ok: true });
}
