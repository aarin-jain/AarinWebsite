import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "../../../db";
import { posts } from "../../../db/schema";
import { ArticleEngagement } from "./article-engagement";

export const dynamic = "force-dynamic";

async function getPost(slug: string) {
  try {
    const [post] = await getDb().select().from(posts).where(and(eq(posts.slug, slug), eq(posts.status, "published"))).limit(1);
    return post ?? null;
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  return post ? { title: `${post.title} — Aarin Jain`, description: post.excerpt } : { title: "Writing — Aarin Jain" };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const paragraphs = post.content.split(/\n\s*\n/).filter(Boolean);

  return (
    <main className="article-page">
      <nav className="nav shell"><a className="brand" href="/">AJ<span>.</span></a><a className="back-writing" href="/writing">← All writing</a></nav>
      <article>
        <header><p className="eyebrow">Essay · {formatDate(post.publishedAt)}</p><h1>{post.title}</h1><p>{post.excerpt}</p></header>
        <div className="article-body">{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      </article>
      <ArticleEngagement slug={slug} />
      <aside className="article-end shell"><span>終</span><div><p>Thanks for reading.</p><a href="/writing">More notes ↗</a></div></aside>
    </main>
  );
}

function formatDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(new Date(value));
}
