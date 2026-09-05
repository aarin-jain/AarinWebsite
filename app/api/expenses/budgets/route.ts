import { getDb } from "../../../../db";
import { expenseBudgets } from "../../../../db/schema";
import { normalizeBudgetInput } from "../../../../domain/expenses";

export async function PUT(request: Request) {
  try {
    const normalized = normalizeBudgetInput(await request.json());
    if (!normalized.ok) return Response.json({ error: normalized.error }, { status: 400 });
    const { category, monthlyCents } = normalized.value;
    const [budget] = await getDb().insert(expenseBudgets).values({ category, monthlyCents, updatedAt: new Date().toISOString() })
      .onConflictDoUpdate({ target: expenseBudgets.category, set: { monthlyCents, updatedAt: new Date().toISOString() } }).returning();
    return Response.json({ budget });
  } catch { return Response.json({ error: "Unable to save this budget." }, { status: 500 }); }
}
