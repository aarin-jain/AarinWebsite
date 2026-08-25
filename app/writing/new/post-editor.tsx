"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { articleParagraphs, editorPath, editorSaveRequest, type EditorPost } from "../../../domain/editor";

type EditorValues = Pick<EditorPost, "title" | "excerpt" | "content" | "status">;

const blankPost: EditorValues = { title: "", excerpt: "", content: "", status: "draft" };

export function PostEditor({ authorName, initialPost = null }: { authorName: string; initialPost?: EditorPost | null }) {
  const [values, setValues] = useState<EditorValues>(() => initialPost ?? blankPost);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const allowNavigation = useRef(false);
  const editing = initialPost !== null;

  useEffect(() => {
    if (!dirty) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!allowNavigation.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [dirty]);

  function change<K extends keyof EditorValues>(field: K, value: EditorValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    allowNavigation.current = false;
    setDirty(true);
    if (status !== "idle") setStatus("idle");
    setMessage("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    const target = editorSaveRequest(initialPost?.id ?? null);

    try {
      const response = await fetch(target.endpoint, {
        method: target.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json() as { post?: EditorPost; error?: string };
      if (!response.ok || !result.post) {
        setStatus("error");
        setMessage(result.error ?? "Could not save this post.");
        return;
      }

      setValues({ title: result.post.title, excerpt: result.post.excerpt, content: result.post.content, status: result.post.status });
      setDirty(false);
      if (!editing) {
        allowNavigation.current = true;
        window.location.href = editorPath(result.post.id);
        return;
      }
      setStatus("saved");
      setMessage("Changes saved.");
    } catch {
      setStatus("error");
      setMessage("Could not reach the server. Your changes are still here.");
    }
  }

  const paragraphs = articleParagraphs(values.content);

  return (
    <main className="editor-page">
      <nav className="nav shell"><a className="brand" href="/">AJ<span>.</span></a><a className="back-writing" href={editing ? "/admin" : "/writing"}>Cancel</a></nav>
      <form className="post-editor shell" onSubmit={save}>
        <header><p className="eyebrow">{editing ? "Edit article · 編集" : "New article · 新しい記事"}</p><h1>{editing ? <>Shape the<br />next draft.</> : <>Start with<br />a good thought.</>}</h1><p>Writing as {authorName}</p></header>
        <div className="editor-fields">
          <label>Title<input name="title" required maxLength={120} placeholder="A clear, specific title" value={values.title} onChange={(event) => change("title", event.target.value)} /></label>
          <label>Short description<textarea name="excerpt" required maxLength={240} rows={2} placeholder="One sentence that earns the next one." value={values.excerpt} onChange={(event) => change("excerpt", event.target.value)} /></label>
          <label>Article<textarea className="article-input" name="content" required minLength={40} maxLength={100000} rows={16} placeholder={'Write in plain text.\n\nLeave a blank line between paragraphs.'} value={values.content} onChange={(event) => change("content", event.target.value)} /></label>
          <label>Publication status<select name="status" value={values.status} onChange={(event) => change("status", event.target.value as EditorValues["status"])}><option value="draft">Save as draft</option><option value="published">Publish</option></select></label>
          <div className="editor-actions">
            <button type="submit" disabled={status === "saving"}>{status === "saving" ? "Saving…" : editing ? "Save changes ↗" : "Save article ↗"}</button>
            <button className="preview-toggle" type="button" aria-pressed={previewOpen} onClick={() => setPreviewOpen((open) => !open)}>{previewOpen ? "Hide preview" : "Preview article"}</button>
          </div>
          <p className={`form-status ${status}`} role="status">{message}</p>
        </div>
        {previewOpen ? <section className="editor-preview" aria-label="Article preview"><p className="eyebrow">Preview · プレビュー</p><article><header><h2>{values.title || "Untitled article"}</h2><p>{values.excerpt || "Your short description will appear here."}</p></header><div className="article-body">{paragraphs.length ? paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>) : <p className="preview-placeholder">Your article preview will appear as you write.</p>}</div></article></section> : null}
      </form>
    </main>
  );
}
