"use client";

import { FormEvent, useState } from "react";

export function PostEditor({ authorName }: { authorName: string }) {
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
    const result = await response.json() as { post?: { slug: string; status: string }; error?: string };
    if (!response.ok || !result.post) { setStatus("error"); setError(result.error ?? "Could not save this post."); return; }
    window.location.href = result.post.status === "published" ? `/writing/${result.post.slug}` : "/writing";
  }

  return (
    <main className="editor-page">
      <nav className="nav shell"><a className="brand" href="/">AJ<span>.</span></a><a className="back-writing" href="/writing">Cancel</a></nav>
      <form className="post-editor shell" onSubmit={save}>
        <header><p className="eyebrow">New article · 新しい記事</p><h1>Start with<br />a good thought.</h1><p>Writing as {authorName}</p></header>
        <div className="editor-fields">
          <label>Title<input name="title" required maxLength={120} placeholder="A clear, specific title" /></label>
          <label>Short description<textarea name="excerpt" required maxLength={240} rows={2} placeholder="One sentence that earns the next one." /></label>
          <label>Article<textarea className="article-input" name="content" required minLength={40} rows={16} placeholder={'Write in plain text.\n\nLeave a blank line between paragraphs.'} /></label>
          <label>Publication status<select name="status" defaultValue="draft"><option value="draft">Save as draft</option><option value="published">Publish now</option></select></label>
          <button type="submit" disabled={status === "saving"}>{status === "saving" ? "Saving…" : "Save article ↗"}</button>
          <p className="form-status" role="status">{status === "error" ? error : ""}</p>
        </div>
      </form>
    </main>
  );
}
