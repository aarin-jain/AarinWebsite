export const EXPENSE_CATEGORIES = ["Housing", "Utilities", "Groceries", "Dining", "Transportation", "Healthcare", "Subscriptions", "Entertainment", "Travel", "Other"] as const;
export const EXPENSE_ACCOUNTS = ["Checking", "Credit Card", "Cash", "Venmo"] as const;
export const EXPENSE_PAYMENT_METHODS = ["Credit", "Cash", "ACH/Transfer"] as const;
export const EXPENSE_TYPES = ["expense", "income"] as const;

type ExpenseType = typeof EXPENSE_TYPES[number];
type ExpenseInput = { date: string; description: string; category: string; account: string; paymentMethod: string; type: ExpenseType; amountCents: number; notes: string };

export function normalizeExpenseInput(value: unknown): { ok: true; value: ExpenseInput } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid("Enter the transaction details.");
  const input = value as Record<string, unknown>;
  const suppliedDate = typeof input.date === "string" ? input.date.trim() : "";
  const date = suppliedDate || localDate();
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const category = typeof input.category === "string" ? input.category.trim() : "";
  const account = typeof input.account === "string" ? input.account.trim() : "";
  const paymentMethod = typeof input.paymentMethod === "string" ? input.paymentMethod.trim() : "";
  const type = typeof input.type === "string" ? input.type.toLowerCase() : "";
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";
  const amount = typeof input.amount === "number" ? input.amount : Number(input.amount);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return invalid("Choose a valid date.");
  if (description.length < 1 || description.length > 120) return invalid("Description must be between 1 and 120 characters.");
  if (!EXPENSE_CATEGORIES.includes(category as never)) return invalid("Choose a valid category.");
  if (account && !EXPENSE_ACCOUNTS.includes(account as never)) return invalid("Choose a valid account.");
  if (paymentMethod && !EXPENSE_PAYMENT_METHODS.includes(paymentMethod as never)) return invalid("Choose a valid payment method.");
  if (!EXPENSE_TYPES.includes(type as never)) return invalid("Choose a valid transaction type.");
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) return invalid("Amount must be greater than zero.");
  if (notes.length > 500) return invalid("Notes must be 500 characters or fewer.");
  return { ok: true, value: { date, description, category, account, paymentMethod, type: type as ExpenseType, amountCents: Math.round(amount * 100), notes } };
}

export function normalizeMonth(value: string | null, fallback = new Date()): string {
  if (value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return value;
  return `${fallback.getUTCFullYear()}-${String(fallback.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function normalizeBudgetInput(value: unknown): { ok: true; value: { category: string; monthlyCents: number } } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid("Enter a budget.");
  const input = value as Record<string, unknown>;
  const category = typeof input.category === "string" ? input.category.trim() : "";
  const amount = typeof input.amount === "number" ? input.amount : Number(input.amount);
  if (!EXPENSE_CATEGORIES.includes(category as never)) return invalid("Choose a valid category.");
  if (!Number.isFinite(amount) || amount < 0 || amount > 10_000_000) return invalid("Budget must be zero or greater.");
  return { ok: true, value: { category, monthlyCents: Math.round(amount * 100) } };
}

function invalid(error: string) { return { ok: false as const, error }; }

function localDate() {
  const value = new Date();
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
