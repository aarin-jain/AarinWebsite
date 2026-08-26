import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "../../../../db";
import { posts } from "../../../../db/schema";
import { parsePostId } from "../../../../domain/posts";
import { PostEditor } from "../../new/post-editor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit post — Aarin Jain" };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const id = parsePostId((await params).id);
  if (id === null) notFound();

  const [post] = await getDb().select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!post) notFound();

  return <PostEditor authorName="Aarin" initialPost={{
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    status: post.status,
    commentsEnabled: post.commentsEnabled,
  }} />;
}
