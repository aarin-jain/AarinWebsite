import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { contactMessages } from "../../../../../db/schema";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as { read?: boolean };
  await getDb().update(contactMessages).set({ readAt: body.read ? new Date().toISOString() : null }).where(eq(contactMessages.id, Number(id)));
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getDb().delete(contactMessages).where(eq(contactMessages.id, Number(id)));
  return Response.json({ ok: true });
}
