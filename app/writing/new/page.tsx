import type { Metadata } from "next";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { PostEditor } from "./post-editor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New post — Aarin Jain" };

export default async function NewPostPage() {
  const user = await requireChatGPTUser("/writing/new");
  return <PostEditor authorName={user.displayName} />;
}
