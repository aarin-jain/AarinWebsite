import { desc } from "drizzle-orm";
import { getDb } from "../../../../db";
import { contactMessages } from "../../../../db/schema";

export async function GET() {
  try {
    const messages = await getDb().select().from(contactMessages).orderBy(desc(contactMessages.createdAt), desc(contactMessages.id));
    return Response.json({ messages });
  } catch { return Response.json({ error: "Unable to load messages." }, { status: 500 }); }
}
