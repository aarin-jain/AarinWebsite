import type { Metadata } from "next";
import { PostEditor } from "./post-editor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New post — Aarin Jain" };

export default async function NewPostPage() {
  return <PostEditor authorName="Aarin" />;
}
