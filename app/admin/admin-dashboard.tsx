"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Vinext production navigation requires document links. */

import { useCallback, useEffect, useState } from "react";

type Message = { id: number; name: string; email: string; message: string; readAt: string | null; createdAt: string };
type Post = { id: number; title: string; slug: string; excerpt: string; status: "draft" | "published"; publishedAt: string | null; updatedAt: string; commentsEnabled: boolean; likeCount: number; commentCount: number };
type Comment = { id: number; publicId: string; parentId: number | null; name: string; email: string; body: string; createdAt: string; postTitle: string; postSlug: string };

export function AdminDashboard({ name }: { name: string }) {
  const [tab, setTab] = useState<"messages" | "posts" | "comments">("messages");
  const [messages, setMessages] = useState<Message[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [messageResponse, postResponse, commentResponse] = await Promise.all([fetch("/api/admin/messages"), fetch("/api/admin/posts"), fetch("/api/admin/comments")]);
    if (!messageResponse.ok || !postResponse.ok || !commentResponse.ok) { setError("Could not load the dashboard."); setLoading(false); return; }
    const messageData = await messageResponse.json() as { messages: Message[] };
    const postData = await postResponse.json() as { posts: Post[] };
    const commentData = await commentResponse.json() as { comments: Comment[] };
    setMessages(messageData.messages);
    setPosts(postData.posts);
    setComments(commentData.comments);
    setLoading(false);
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

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

  async function deleteComment(id: number) {
    if (!window.confirm("Delete this comment and all of its replies permanently?")) return;
    const response = await fetch(`/api/admin/comments/${id}`, { method: "DELETE" });
    if (!response.ok) { setError("Could not delete this comment."); return; }
    await load();
  }

  const unread = messages.filter((message) => !message.readAt).length;
  const drafts = posts.filter((post) => post.status === "draft").length;

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <a className="brand" href="/">AJ<span>.</span></a>
        <div><p className="admin-label">Workspace</p><button className={tab === "messages" ? "active" : ""} onClick={() => setTab("messages")}><span>Inbox</span><b>{unread}</b></button><button className={tab === "posts" ? "active" : ""} onClick={() => setTab("posts")}><span>Writing</span><b>{drafts}</b></button><button className={tab === "comments" ? "active" : ""} onClick={() => setTab("comments")}><span>Comments</span><b>{comments.length}</b></button></div>
        <nav><a href="/">View portfolio ↗</a><a href="/writing">View writing ↗</a><a href="/writing/new">New article ＋</a></nav>
      </aside>

      <section className="admin-main">
        <header><div><p className="eyebrow">Private dashboard · 管理</p><h1>{tab === "messages" ? "Inbox" : tab === "posts" ? "Writing" : "Comments"}</h1></div><p>Signed in as<br /><strong>{name}</strong></p></header>
        <div className="admin-stats"><article><span>{String(messages.length).padStart(2, "0")}</span><p>Total messages</p></article><article><span>{String(unread).padStart(2, "0")}</span><p>Unread</p></article><article><span>{String(posts.length).padStart(2, "0")}</span><p>Articles</p></article><article><span>{String(comments.length).padStart(2, "0")}</span><p>Comments</p></article></div>

        {loading ? <p className="admin-empty">Loading your workspace…</p> : error ? <p className="admin-empty">{error}</p> : tab === "messages" ? (
          <div className="admin-list">
            <div className="admin-list-heading"><p>Messages</p><span>{unread} unread</span></div>
            {messages.length ? messages.map((message) => <article className={`message-card ${message.readAt ? "read" : ""}`} key={message.id}><button className="message-open" onClick={() => toggleMessage(message)} aria-label={message.readAt ? "Mark unread" : "Mark read"}><i /></button><div className="message-meta"><h2>{message.name}</h2><a href={`mailto:${message.email}`}>{message.email}</a><time>{formatDate(message.createdAt)}</time></div><p>{message.message}</p><div className="row-actions"><a href={`mailto:${message.email}?subject=Re: Your note to Aarin`}>Reply</a><button onClick={() => toggleMessage(message)}>{message.readAt ? "Mark unread" : "Mark read"}</button><button className="danger" onClick={() => deleteMessage(message.id)}>Delete</button></div></article>) : <p className="admin-empty">No messages yet.</p>}
          </div>
        ) : tab === "posts" ? (
          <div className="admin-list">
            <div className="admin-list-heading"><p>Articles</p><a href="/writing/new">New article ＋</a></div>
            {posts.length ? posts.map((post) => <article className="post-row" key={post.id}><span className={`status-pill ${post.status}`}>{post.status}</span><div><p>{formatDate(post.updatedAt)}</p><h2>{post.title}</h2><p>{post.excerpt}</p><p className="post-engagement">♥ {post.likeCount} · {post.commentCount} comments · Comments {post.commentsEnabled ? "open" : "closed"}</p></div><div className="row-actions"><a href={`/writing/edit/${post.id}`}>Edit</a>{post.status === "published" ? <a href={`/writing/${post.slug}`}>View</a> : null}<button onClick={() => togglePost(post)}>{post.status === "published" ? "Unpublish" : "Publish"}</button><button className="danger" onClick={() => deletePost(post.id)}>Delete</button></div></article>) : <p className="admin-empty">No articles yet. <a href="/writing/new">Write the first one.</a></p>}
          </div>
        ) : (
          <div className="admin-list">
            <div className="admin-list-heading"><p>Published comments</p><span>{comments.length} total</span></div>
            {comments.length ? comments.map((comment) => <article className="comment-admin-card" key={comment.id}><div><span>{comment.parentId ? "Reply" : "Comment"}</span><a href={`/writing/${comment.postSlug}`}>{comment.postTitle} ↗</a></div><div><h2>{comment.name}</h2>{comment.email ? <a href={`mailto:${comment.email}`}>{comment.email}</a> : null}<time>{formatDate(comment.createdAt)}</time></div><p>{comment.body}</p><button className="danger" onClick={() => deleteComment(comment.id)}>Delete</button></article>) : <p className="admin-empty">No comments yet.</p>}
          </div>
        )}
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
