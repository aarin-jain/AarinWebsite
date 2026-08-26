"use client";

import { useEffect, useState } from "react";

export function ArticleLikeButton({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const [like, setLike] = useState({ count: 0, liked: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/posts/${slug}/likes`)
      .then(async (response) => { if (response.ok) setLike(await response.json()); })
      .finally(() => setLoading(false));
  }, [slug]);

  async function toggleLike() {
    setSaving(true);
    try {
      const response = await fetch(`/api/posts/${slug}/likes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liked: !like.liked }),
      });
      const result = await response.json() as { count?: number; liked?: boolean };
      if (response.ok && result.count !== undefined && result.liked !== undefined) {
        setLike({ count: result.count, liked: result.liked });
      }
    } finally { setSaving(false); }
  }

  return <button
    type="button"
    className={`article-like-button${compact ? " compact" : ""}`}
    aria-label={`${like.liked ? "Unlike" : "Like"} this article. ${like.count} ${like.count === 1 ? "like" : "likes"}.`}
    aria-pressed={like.liked}
    disabled={saving || loading}
    onClick={toggleLike}
  >
    <span aria-hidden="true">{like.liked ? "♥" : "♡"}</span>
    <strong>{like.count}</strong>
    <small>{like.liked ? "Liked" : "Like"}</small>
  </button>;
}
