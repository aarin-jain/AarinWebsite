import { desc } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { contactMessages } from "../../../../db/schema";

export async function GET() {
  if (!(await getChatGPTUser())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const messages = await getDb().select().from(contactMessages).orderBy(desc(contactMessages.createdAt), desc(contactMessages.id));
    return Response.json({ messages });
  } catch { return Response.json({ error: "Unable to load messages." }, { status: 500 }); }
}
