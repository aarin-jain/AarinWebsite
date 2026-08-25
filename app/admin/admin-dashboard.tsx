"use client";

import { useCallback, useEffect, useState } from "react";

type Message = { id: number; name: string; email: string; message: string; readAt: string | null; createdAt: string };
type Post = { id: number; title: string; slug: string; excerpt: string; status: "draft" | "published"; publishedAt: string | null; updatedAt: string };

export function AdminDashboard({ name }: { name: string }) {
  const [tab, setTab] = useState<"messages" | "posts">("messages");
  const [messages, setMessages] = useState<Message[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [messageResponse, postResponse] = await Promise.all([fetch("/api/admin/messages"), fetch("/api/admin/posts")]);
    if (!messageResponse.ok || !postResponse.ok) { setError("Could not load the dashboard."); setLoading(false); return; }
    const messageData = await messageResponse.json() as { messages: Message[] };
    const postData = await postResponse.json() as { posts: Post[] };
    setMessages(messageData.messages);
    setPosts(postData.posts);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function toggleMessage(message: Message) {
    await fetch(`/api/admin/messages/${message.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ read: !message.readAt }) });
    await load();
  }

  async function deleteMessage(id: number) {
    if (!window.confirm("Delete this message permanently?")) return;
    await fetch(`/api/admin/messages/${id}`, { method: "DELETE" });
    await load();
  }

  async function togglePost(post: Post) {
    const status = post.status === "published" ? "draft" : "published";
    await fetch(`/api/admin/posts/${post.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    await load();
  }

  async function deletePost(id: number) {
    if (!window.confirm("Delete this article permanently?")) return;
    await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
    await load();
  }

  const unread = messages.filter((message) => !message.readAt).length;
  const drafts = posts.filter((post) => post.status === "draft").length;

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <a className="brand" href="/">AJ<span>.</span></a>
        <div><p className="admin-label">Workspace</p><button className={tab === "messages" ? "active" : ""} onClick={() => setTab("messages")}><span>Inbox</span><b>{unread}</b></button><button className={tab === "posts" ? "active" : ""} onClick={() => setTab("posts")}><span>Writing</span><b>{drafts}</b></button></div>
        <nav><a href="/">View portfolio ↗</a><a href="/writing">View writing ↗</a><a href="/writing/new">New article ＋</a></nav>
      </aside>

      <section className="admin-main">
        <header><div><p className="eyebrow">Private dashboard · 管理</p><h1>{tab === "messages" ? "Inbox" : "Writing"}</h1></div><p>Signed in as<br /><strong>{name}</strong></p></header>
        <div className="admin-stats"><article><span>{String(messages.length).padStart(2, "0")}</span><p>Total messages</p></article><article><span>{String(unread).padStart(2, "0")}</span><p>Unread</p></article><article><span>{String(posts.length).padStart(2, "0")}</span><p>Articles</p></article><article><span>{String(drafts).padStart(2, "0")}</span><p>Drafts</p></article></div>

        {loading ? <p className="admin-empty">Loading your workspace…</p> : error ? <p className="admin-empty">{error}</p> : tab === "messages" ? (
          <div className="admin-list">
            <div className="admin-list-heading"><p>Messages</p><span>{unread} unread</span></div>
            {messages.length ? messages.map((message) => <article className={`message-card ${message.readAt ? "read" : ""}`} key={message.id}><button className="message-open" onClick={() => toggleMessage(message)} aria-label={message.readAt ? "Mark unread" : "Mark read"}><i /></button><div className="message-meta"><h2>{message.name}</h2><a href={`mailto:${message.email}`}>{message.email}</a><time>{formatDate(message.createdAt)}</time></div><p>{message.message}</p><div className="row-actions"><a href={`mailto:${message.email}?subject=Re: Your note to Aarin`}>Reply</a><button onClick={() => toggleMessage(message)}>{message.readAt ? "Mark unread" : "Mark read"}</button><button className="danger" onClick={() => deleteMessage(message.id)}>Delete</button></div></article>) : <p className="admin-empty">No messages yet.</p>}
          </div>
        ) : (
          <div className="admin-list">
            <div className="admin-list-heading"><p>Articles</p><a href="/writing/new">New article ＋</a></div>
            {posts.length ? posts.map((post) => <article className="post-row" key={post.id}><span className={`status-pill ${post.status}`}>{post.status}</span><div><p>{formatDate(post.updatedAt)}</p><h2>{post.title}</h2><p>{post.excerpt}</p></div><div className="row-actions"><a href={`/writing/edit/${post.id}`}>Edit</a>{post.status === "published" ? <a href={`/writing/${post.slug}`}>View</a> : null}<button onClick={() => togglePost(post)}>{post.status === "published" ? "Unpublish" : "Publish"}</button><button className="danger" onClick={() => deletePost(post.id)}>Delete</button></div></article>) : <p className="admin-empty">No articles yet. <a href="/writing/new">Write the first one.</a></p>}
          </div>
        )}
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
