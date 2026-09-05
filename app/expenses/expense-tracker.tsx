"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Vinext production navigation requires document links. */

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Transaction = { id: number; date: string; description: string; category: string; account: string; paymentMethod: string; type: "expense" | "income" | "transfer"; amountCents: number; notes: string };
type Budget = { category: string; monthlyCents: number };
type ExpenseData = { transactions: Transaction[]; budgets: Budget[]; categories: string[]; accounts: string[]; paymentMethods: string[] };
const EMPTY: ExpenseData = { transactions: [], budgets: [], categories: [], accounts: [], paymentMethods: [] };

export function ExpenseTracker() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<ExpenseData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setMessage("");
    try {
      const response = await fetch(`/api/expenses?month=${month}`);
      const result = await response.json() as ExpenseData & { error?: string };
      if (!response.ok) throw new Error(result.error);
      setData(result);
    } catch { setMessage("Could not load your expenses."); }
    finally { setLoading(false); }
  }, [month]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const totals = useMemo(() => data.transactions.reduce((sum, item) => {
    if (item.type === "expense") sum.expenses += item.amountCents;
    if (item.type === "income") sum.income += item.amountCents;
    return sum;
  }, { expenses: 0, income: 0 }), [data.transactions]);
  const budgetTotal = data.budgets.reduce((sum, item) => sum + item.monthlyCents, 0);
  const net = totals.income - totals.expenses;

  async function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    const form = event.currentTarget;
    try {
      const response = await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to save.");
      form.reset(); (form.elements.namedItem("date") as HTMLInputElement).value = today();
      await load(); setMessage("Transaction added.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save this transaction."); }
    finally { setSaving(false); }
  }

  async function deleteTransaction(id: number) {
    if (!window.confirm("Delete this transaction?")) return;
    const response = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (!response.ok) { setMessage("Could not delete that transaction."); return; }
    await load();
  }

  async function saveBudget(category: string, amount: string) {
    const response = await fetch("/api/expenses/budgets", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, amount }) });
    if (!response.ok) { setMessage(`Could not save the ${category} budget.`); return; }
    await load(); setMessage("Budget updated.");
  }

  return <main className="expenses-page">
    <nav className="expense-nav shell"><a className="brand" href="/">AJ<span>.</span></a><div><a href="/admin">Dashboard</a><a href="/writing">Writing</a></div><span>Private ledger</span></nav>

    <header className="expense-hero shell">
      <div><p className="eyebrow">Expenses · 家計</p><h1>Money,<br /><em>made clear.</em></h1></div>
      <label>Viewing month<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
    </header>

    <section className="expense-summary shell" aria-label="Monthly summary">
      <article><p>Spent</p><strong>{money(totals.expenses)}</strong><span>{budgetTotal ? `${Math.round(totals.expenses / budgetTotal * 100)}% of budget` : "No budget set"}</span></article>
      <article><p>Income</p><strong>{money(totals.income)}</strong><span>This month</span></article>
      <article className={net < 0 ? "negative" : "positive"}><p>Net</p><strong>{signedMoney(net)}</strong><span>Income less expenses</span></article>
      <article><p>Budget left</p><strong>{budgetTotal ? signedMoney(budgetTotal - totals.expenses) : "—"}</strong><span>{budgetTotal ? `of ${money(budgetTotal)}` : "Set monthly targets"}</span></article>
    </section>

    <div className="expense-workspace shell">
      <section className="quick-expense">
        <header><p className="eyebrow">Quick entry</p><h2>Add a transaction</h2></header>
        <form onSubmit={addTransaction}>
          <label className="wide">Description<input name="description" required maxLength={120} placeholder="Coffee, rent, paycheck…" /></label>
          <label>Amount<input name="amount" type="number" inputMode="decimal" required min="0.01" max="10000000" step="0.01" placeholder="0.00" /></label>
          <label>Date<input name="date" type="date" required defaultValue={today()} /></label>
          <label>Type<select name="type" defaultValue="expense"><option value="expense">Expense</option><option value="income">Income</option><option value="transfer">Transfer</option></select></label>
          <label>Category<select name="category">{data.categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Account<select name="account">{data.accounts.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Payment<select name="paymentMethod">{data.paymentMethods.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="wide">Notes <span>optional</span><input name="notes" maxLength={500} placeholder="Add context if useful" /></label>
          <button type="submit" disabled={saving}>{saving ? "Adding…" : "Add transaction ＋"}</button>
        </form>
        <p className="expense-message" role="status">{message}</p>
      </section>

      <section className="budget-panel">
        <header><div><p className="eyebrow">Monthly plan</p><h2>Budget</h2></div><button type="button" onClick={() => setBudgetOpen(!budgetOpen)}>{budgetOpen ? "Done" : "Edit"}</button></header>
        <div className="budget-list">{data.categories.map((category) => {
          const spent = data.transactions.filter((item) => item.type === "expense" && item.category === category).reduce((sum, item) => sum + item.amountCents, 0);
          const budget = data.budgets.find((item) => item.category === category)?.monthlyCents ?? 0;
          const ratio = budget ? Math.min(spent / budget * 100, 100) : 0;
          return <article key={category}><div><strong>{category}</strong>{budgetOpen ? <BudgetInput category={category} cents={budget} save={saveBudget} /> : <span>{money(spent)} / {budget ? money(budget) : "—"}</span>}</div><i><b style={{ width: `${ratio}%` }} /></i></article>;
        })}</div>
      </section>
    </div>

    <section className="transaction-section shell">
      <header><div><p className="eyebrow">Ledger</p><h2>{monthLabel(month)}</h2></div><span>{data.transactions.length} {data.transactions.length === 1 ? "entry" : "entries"}</span></header>
      {loading ? <p className="expense-empty">Loading transactions…</p> : data.transactions.length ? <div className="transaction-list">{data.transactions.map((item) => <article key={item.id}>
        <time>{shortDate(item.date)}</time><div><strong>{item.description}</strong><span>{item.category} · {item.account}</span>{item.notes ? <small>{item.notes}</small> : null}</div><b className={item.type}>{item.type === "income" ? "+" : item.type === "expense" ? "−" : ""}{money(item.amountCents)}</b><button onClick={() => deleteTransaction(item.id)} aria-label={`Delete ${item.description}`}>×</button>
      </article>)}</div> : <p className="expense-empty">No transactions this month. Add the first one above.</p>}
    </section>
  </main>;
}

function BudgetInput({ category, cents, save }: { category: string; cents: number; save: (category: string, amount: string) => void }) {
  const [value, setValue] = useState((cents / 100).toFixed(2));
  return <span className="budget-input"><span>$</span><input aria-label={`${category} monthly budget`} type="number" min="0" step="0.01" value={value} onChange={(event) => setValue(event.target.value)} onBlur={() => void save(category, value)} /></span>;
}

function currentMonth() { return today().slice(0, 7); }
function today() { const value = new Date(); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`; }
function money(cents: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(cents / 100); }
function signedMoney(cents: number) { return `${cents > 0 ? "+" : cents < 0 ? "−" : ""}${money(Math.abs(cents))}`; }
function monthLabel(month: string) { const [year, value] = month.split("-").map(Number); return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, value - 1, 1))); }
function shortDate(date: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`)); }
