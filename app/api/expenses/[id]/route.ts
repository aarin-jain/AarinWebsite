import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { expenseTransactions } from "../../../../db/schema";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) return Response.json({ error: "Invalid transaction." }, { status: 400 });
  try {
    const deleted = await getDb().delete(expenseTransactions).where(eq(expenseTransactions.id, id)).returning({ id: expenseTransactions.id });
    return deleted.length ? Response.json({ deleted: true }) : Response.json({ error: "Transaction not found." }, { status: 404 });
  } catch { return Response.json({ error: "Unable to delete this transaction." }, { status: 500 }); }
}
