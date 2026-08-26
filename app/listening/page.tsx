import type { Metadata } from "next";
import { ListeningDashboard } from "./listening-dashboard";

export const metadata: Metadata = { title: "Listening — Aarin Jain", description: "The music currently in Aarin Jain's orbit." };

export default function ListeningPage() {
  return <ListeningDashboard />;
}
