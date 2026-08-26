import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../../../db";
import { articleComments, commentReactions } from "../../../../../../../db/schema";
import { isPublicCommentId, normalizeReaction, readJsonObject } from "../../../../../../../domain/engagement";
import { enforceRateLimit, publishedPost } from "../../../../../../../services/engagement";
import { readerIdentity, withReaderCookie } from "../../../../../../../services/reader-identity";

type Context = { params: Promise<{ slug: string; commentId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { slug, commentId } = await params;
    if (!isPublicCommentId(commentId)) return Response.json({ error: "Comment not found." }, { status: 404 });
    const post = await publishedPost(slug);
    if (!post || !post.commentsEnabled) return Response.json({ error: "Comment not found." }, { status: 404 });
    const [comment] = await getDb().select({ id: articleComments.id, postId: articleComments.postId }).from(articleComments).where(eq(articleComments.publicId, commentId)).limit(1);
    if (!comment || comment.postId !== post.id) return Response.json({ error: "Comment not found." }, { status: 404 });
    const body = await readJsonObject(request);
    if (!body.ok) return Response.json({ error: body.error }, { status: 400 });
    const normalized = normalizeReaction(body.value.reaction);
    if (!normalized.ok) return Response.json({ error: normalized.error }, { status: 400 });
    const identity = await readerIdentity(request);
    if (!await enforceRateLimit(env.DB, `comment-reaction:${identity.hash}`, 60, 60_000)) return Response.json({ error: "Too many reaction changes. Try again shortly." }, { status: 429 });

    if (normalized.value === null) {
      await getDb().delete(commentReactions).where(and(eq(commentReactions.commentId, comment.id), eq(commentReactions.visitorHash, identity.hash)));
    } else {
      await getDb().insert(commentReactions).values({ commentId: comment.id, visitorHash: identity.hash, reaction: normalized.value, updatedAt: new Date().toISOString() }).onConflictDoUpdate({ target: [commentReactions.commentId, commentReactions.visitorHash], set: { reaction: normalized.value, updatedAt: new Date().toISOString() } });
    }
    const rows = await getDb().select({ visitorHash: commentReactions.visitorHash, reaction: commentReactions.reaction }).from(commentReactions).where(eq(commentReactions.commentId, comment.id));
    return withReaderCookie(Response.json({ likes: rows.filter((row) => row.reaction === "like").length, dislikes: rows.filter((row) => row.reaction === "dislike").length, reaction: rows.find((row) => row.visitorHash === identity.hash)?.reaction ?? null }), identity.setCookie);
  } catch { return Response.json({ error: "Unable to save your reaction." }, { status: 500 }); }
}
