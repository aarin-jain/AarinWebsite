import type { Metadata } from "next";
import { AdminDashboard } from "./admin-dashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard — Aarin Jain" };

export default async function AdminPage() {
  return <AdminDashboard name="Aarin" />;
}
