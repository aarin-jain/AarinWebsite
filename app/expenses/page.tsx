import type { Metadata } from "next";
import { ExpenseTracker } from "./expense-tracker";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Expenses — Aarin Jain", description: "Private expense tracker." };

export default function ExpensesPage() { return <ExpenseTracker />; }
