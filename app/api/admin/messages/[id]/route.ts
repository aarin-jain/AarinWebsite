import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { contactMessages } from "../../../../../db/schema";
import { parsePostId as parseRecordId } from "../../../../../domain/posts";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const id = parseRecordId((await params).id);
  if (id === null) return Response.json({ error: "Invalid message ID." }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || !("read" in body) || typeof body.read !== "boolean") {
    return Response.json({ error: "Read status must be true or false." }, { status: 400 });
  }

  try {
    const [message] = await getDb().update(contactMessages).set({ readAt: body.read ? new Date().toISOString() : null }).where(eq(contactMessages.id, id)).returning({ id: contactMessages.id });
    if (!message) return Response.json({ error: "Message not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Unable to update this message." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const id = parseRecordId((await params).id);
  if (id === null) return Response.json({ error: "Invalid message ID." }, { status: 400 });

  try {
    const [message] = await getDb().delete(contactMessages).where(eq(contactMessages.id, id)).returning({ id: contactMessages.id });
    if (!message) return Response.json({ error: "Message not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Unable to delete this message." }, { status: 500 });
  }
}
