import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { posts } from "../../db/schema";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Writing — Aarin Jain",
  description: "Notes on products, design, engineering, and the spaces between them.",
};

async function getPublishedPosts() {
  try {
    return await getDb().select().from(posts).where(eq(posts.status, "published")).orderBy(desc(posts.publishedAt), desc(posts.id));
  } catch {
    return [];
  }
}

export default async function WritingPage() {
  const articles = await getPublishedPosts();

  return (
    <main className="writing-page">
      <nav className="nav shell" aria-label="Writing navigation">
        <a className="brand" href="/" aria-label="Aarin Jain, home">AJ<span>.</span></a>
        <div className="nav-links writing-nav"><a href="/">Portfolio</a><a href="/writing" aria-current="page">Writing</a></div>
        <a className="availability" href="/writing/new"><i /> Write a post</a>
      </nav>

      <header className="writing-hero shell">
        <p className="eyebrow">Writing · 文章</p>
        <h1>Notes on making<br />things <em>matter.</em></h1>
        <div><p>Ideas in progress about products, interfaces, engineering, and the human details that hold them together.</p><span>{String(articles.length).padStart(2, "0")} essays</span></div>
      </header>

      <section className="article-index shell" aria-label="Articles">
        {articles.length ? articles.map((article, index) => (
          <a className="article-row" href={`/writing/${article.slug}`} key={article.id}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div><p>{formatDate(article.publishedAt)}</p><h2>{article.title}</h2><p>{article.excerpt}</p></div>
            <b aria-hidden="true">↗</b>
          </a>
        )) : (
          <div className="empty-writing"><span>余白</span><h2>The first page is still blank.</h2><p>Aarin’s first note will appear here when it’s ready.</p><a href="/writing/new">Write the first post ↗</a></div>
        )}
      </section>

      <footer className="shell"><a className="brand" href="/">AJ<span>.</span></a><p>Thoughts, loosely held.</p><div><a href="/">Portfolio</a><a href="/writing/new">Editor</a></div></footer>
    </main>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Draft";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
