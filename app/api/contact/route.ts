import { getDb } from "../../../db";
import { contactMessages } from "../../../db/schema";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; email?: string; message?: string };
    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const message = body.message?.trim() ?? "";

    if (!name || !/^\S+@\S+\.\S+$/.test(email) || message.length < 10) {
      return Response.json({ error: "Please complete every field." }, { status: 400 });
    }

    await getDb().insert(contactMessages).values({ name, email, message });
    return Response.json({ ok: true }, { status: 201 });
  } catch {
    return Response.json({ error: "Unable to save your message." }, { status: 500 });
  }
}
