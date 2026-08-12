import type { Metadata } from "next";
import { requireChatGPTUser } from "../chatgpt-auth";
import { AdminDashboard } from "./admin-dashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard — Aarin Jain" };

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  return <AdminDashboard name={user.displayName} />;
}
