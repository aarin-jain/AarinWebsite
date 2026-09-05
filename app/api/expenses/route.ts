import { and, asc, desc, gte, lt } from "drizzle-orm";
import { getDb } from "../../../db";
import { expenseBudgets, expenseTransactions } from "../../../db/schema";
import { EXPENSE_ACCOUNTS, EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS, normalizeExpenseInput, normalizeMonth } from "../../../domain/expenses";

export async function GET(request: Request) {
  try {
    const month = normalizeMonth(new URL(request.url).searchParams.get("month"));
    const start = `${month}-01`;
    const [year, monthNumber] = month.split("-").map(Number);
    const next = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);
    const [transactions, budgets] = await Promise.all([
      getDb().select().from(expenseTransactions).where(and(gte(expenseTransactions.date, start), lt(expenseTransactions.date, next))).orderBy(desc(expenseTransactions.date), desc(expenseTransactions.id)),
      getDb().select().from(expenseBudgets).orderBy(asc(expenseBudgets.category)),
    ]);
    return Response.json({ month, transactions, budgets, categories: EXPENSE_CATEGORIES, accounts: EXPENSE_ACCOUNTS, paymentMethods: EXPENSE_PAYMENT_METHODS });
  } catch { return Response.json({ error: "Unable to load expenses." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const normalized = normalizeExpenseInput(await request.json());
    if (!normalized.ok) return Response.json({ error: normalized.error }, { status: 400 });
    const [transaction] = await getDb().insert(expenseTransactions).values(normalized.value).returning();
    return Response.json({ transaction }, { status: 201 });
  } catch { return Response.json({ error: "Unable to save this transaction." }, { status: 500 }); }
}
