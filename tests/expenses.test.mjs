import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBudgetInput, normalizeExpenseInput, normalizeMonth } from "../domain/expenses.ts";

const valid = { date: "2026-09-05", description: "Coffee", category: "Dining", account: "Credit Card", paymentMethod: "Credit", type: "expense", amount: "4.75", notes: "Meeting" };

test("normalizes a valid expense into integer cents", () => {
  assert.deepEqual(normalizeExpenseInput(valid), { ok: true, value: { date: "2026-09-05", description: "Coffee", category: "Dining", account: "Credit Card", paymentMethod: "Credit", type: "expense", amountCents: 475, notes: "Meeting" } });
});

test("rejects invalid expense fields and non-positive amounts", () => {
  for (const update of [{ amount: "0" }, { category: "Mystery" }, { date: "Friday" }, { description: "" }, { type: "refund" }]) {
    assert.equal(normalizeExpenseInput({ ...valid, ...update }).ok, false);
  }
});

test("accepts zero budgets and rejects unknown categories", () => {
  assert.deepEqual(normalizeBudgetInput({ category: "Housing", amount: "0" }), { ok: true, value: { category: "Housing", monthlyCents: 0 } });
  assert.equal(normalizeBudgetInput({ category: "Mystery", amount: 10 }).ok, false);
});

test("uses valid month keys and falls back for invalid ones", () => {
  const fallback = new Date("2026-09-05T00:00:00Z");
  assert.equal(normalizeMonth("2026-02", fallback), "2026-02");
  assert.equal(normalizeMonth("2026-13", fallback), "2026-09");
});
