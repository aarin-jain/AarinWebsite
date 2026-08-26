"use client";

import { FormEvent, useEffect, useState, type CSSProperties } from "react";

type Reaction = "like" | "dislike" | null;
type PublicComment = { id: string; parentId: string | null; name: string; body: string; createdAt: string; likes: number; dislikes: number; reaction: Reaction };

export function ArticleEngagement({ slug }: { slug: string }) {
  const [like, setLike] = useState({ count: 0, liked: false });
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [likeSaving, setLikeSaving] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [commentSaving, setCommentSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([fetch(`/api/posts/${slug}/likes`), fetch(`/api/posts/${slug}/comments`)])
      .then(async ([likeResponse, commentResponse]) => {
        if (likeResponse.ok) setLike(await likeResponse.json());
        if (commentResponse.ok) {
          const value = await commentResponse.json() as { enabled: boolean; comments: PublicComment[] };
          setCommentsEnabled(value.enabled); setComments(value.comments);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  async function toggleLike() {
    setLikeSaving(true); setMessage("");
    try {
      const response = await fetch(`/api/posts/${slug}/likes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ liked: !like.liked }) });
      const result = await response.json() as { count?: number; liked?: boolean; error?: string };
      if (!response.ok || result.count === undefined || result.liked === undefined) throw new Error(result.error);
      setLike({ count: result.count, liked: result.liked });
    } catch { setMessage("Your like was not saved. Please try again."); }
    finally { setLikeSaving(false); }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>, parentId: string | null) {
    event.preventDefault();
    const form = event.currentTarget;
    setCommentSaving(parentId ?? "root"); setMessage("");
    try {
      const payload = { ...Object.fromEntries(new FormData(form)), parentId };
      const response = await fetch(`/api/posts/${slug}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json() as { comments?: PublicComment[]; error?: string };
      if (!response.ok || !result.comments) throw new Error(result.error || "Unable to publish comment.");
      setComments(result.comments); form.reset(); setReplyTo(null); setMessage("Your comment is live.");
    } catch (error) { setMessage(error instanceof Error && error.message ? error.message : "Your comment was not published."); }
    finally { setCommentSaving(null); }
  }

  async function react(comment: PublicComment, reaction: Exclude<Reaction, null>) {
    const next = comment.reaction === reaction ? null : reaction;
    try {
      const response = await fetch(`/api/posts/${slug}/comments/${comment.id}/reaction`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reaction: next }) });
      const result = await response.json() as { likes?: number; dislikes?: number; reaction?: Reaction; error?: string };
      if (!response.ok || result.likes === undefined || result.dislikes === undefined) throw new Error(result.error);
      setComments((current) => current.map((item) => item.id === comment.id ? { ...item, likes: result.likes!, dislikes: result.dislikes!, reaction: result.reaction ?? null } : item));
    } catch { setMessage("That reaction was not saved. Please try again."); }
  }

  const roots = comments.filter((comment) => !comment.parentId || !comments.some((candidate) => candidate.id === comment.parentId));

  return <section className="engagement shell" aria-label="Article discussion">
    <div className="article-like"><button type="button" aria-pressed={like.liked} disabled={likeSaving || loading} onClick={toggleLike}><span aria-hidden="true">{like.liked ? "♥" : "♡"}</span><strong>{like.count}</strong><small>{like.liked ? "Liked" : "Like"}</small></button></div>
    <div className="discussion">
      <header><h2>Comments</h2><span>{comments.length} {comments.length === 1 ? "comment" : "comments"}</span></header>
      {!commentsEnabled ? <p className="comments-closed">Comments are closed for this article.</p> : <>
        <CommentForm onSubmit={(event) => submitComment(event, null)} saving={commentSaving === "root"} />
        <div className="comment-list">{roots.length ? roots.map((comment) => <CommentNode key={comment.id} comment={comment} all={comments} replyTo={replyTo} setReplyTo={setReplyTo} react={react} submitComment={submitComment} saving={commentSaving} depth={0} />) : <p className="comments-empty">No comments yet. Start the conversation.</p>}</div>
      </>}
      <p className="engagement-message" role="status">{message}</p>
    </div>
  </section>;
}

function CommentNode({ comment, all, replyTo, setReplyTo, react, submitComment, saving, depth }: { comment: PublicComment; all: PublicComment[]; replyTo: string | null; setReplyTo: (id: string | null) => void; react: (comment: PublicComment, reaction: "like" | "dislike") => void; submitComment: (event: FormEvent<HTMLFormElement>, parentId: string | null) => void; saving: string | null; depth: number }) {
  const children = all.filter((candidate) => candidate.parentId === comment.id);
  return <article className="comment" style={{ "--comment-indent": `${Math.min(depth, 4) * 28}px` } as CSSProperties}>
    <div className="comment-main"><div className="comment-meta"><strong>{comment.name}</strong><time>{formatDate(comment.createdAt)}</time></div><p>{comment.body}</p><div className="comment-actions"><button aria-pressed={comment.reaction === "like"} onClick={() => react(comment, "like")}>↑ {comment.likes}</button><button aria-pressed={comment.reaction === "dislike"} onClick={() => react(comment, "dislike")}>↓ {comment.dislikes}</button><button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}>{replyTo === comment.id ? "Cancel" : "Reply"}</button></div></div>
    {replyTo === comment.id ? <CommentForm compact onSubmit={(event) => submitComment(event, comment.id)} saving={saving === comment.id} /> : null}
    {children.map((child) => <CommentNode key={child.id} comment={child} all={all} replyTo={replyTo} setReplyTo={setReplyTo} react={react} submitComment={submitComment} saving={saving} depth={depth + 1} />)}
  </article>;
}

function CommentForm({ onSubmit, saving, compact = false }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; saving: boolean; compact?: boolean }) {
  const [anonymous, setAnonymous] = useState(true);
  return <form className={`comment-form ${compact ? "compact" : ""}`} onSubmit={onSubmit}>
    {!compact ? <p>Comments publish immediately.</p> : <p>Reply to this thread.</p>}
    <label className="anonymous-setting"><input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} /><span>Post anonymously</span></label>
    {!anonymous ? <label>Name<input name="name" required minLength={2} maxLength={80} autoComplete="name" placeholder="Your name" /></label> : null}
    <label>Comment<textarea name="body" required minLength={3} maxLength={2000} rows={compact ? 3 : 4} /></label>
    <label className="comment-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
    <button type="submit" disabled={saving}>{saving ? "Publishing…" : compact ? "Post reply ↗" : "Post comment ↗"}</button>
  </form>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)); }
