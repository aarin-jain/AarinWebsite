import { env } from "cloudflare:workers";
import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { articleComments, commentReactions } from "../../../../../db/schema";
import { normalizeCommentInput, readJsonObject } from "../../../../../domain/engagement";
import { enforceRateLimit, publishedPost } from "../../../../../services/engagement";
import { readerIdentity, withReaderCookie } from "../../../../../services/reader-identity";

type Context = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const post = await publishedPost((await params).slug);
    if (!post) return Response.json({ error: "Article not found." }, { status: 404 });
    const identity = await readerIdentity(request);
    const comments = post.commentsEnabled ? await publicComments(post.id, identity.hash) : [];
    return withReaderCookie(Response.json({ enabled: post.commentsEnabled, comments }), identity.setCookie);
  } catch { return Response.json({ error: "Unable to load comments." }, { status: 500 }); }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const post = await publishedPost((await params).slug);
    if (!post) return Response.json({ error: "Article not found." }, { status: 404 });
    if (!post.commentsEnabled) return Response.json({ error: "Comments are closed for this article." }, { status: 403 });
    const body = await readJsonObject(request);
    if (!body.ok) return Response.json({ error: body.error }, { status: 400 });
    const normalized = normalizeCommentInput(body.value);
    if (!normalized.ok) return Response.json({ error: normalized.error }, { status: 400 });
    const identity = await readerIdentity(request);
    if (!await enforceRateLimit(env.DB, `comment:${identity.hash}`, 4, 10 * 60_000)) return Response.json({ error: "You are commenting too quickly. Try again later." }, { status: 429 });

    let parentId: number | null = null;
    if (normalized.value.parentId) {
      const [parent] = await getDb().select({ id: articleComments.id, postId: articleComments.postId }).from(articleComments).where(eq(articleComments.publicId, normalized.value.parentId)).limit(1);
      if (!parent || parent.postId !== post.id) return Response.json({ error: "Reply target was not found." }, { status: 400 });
      parentId = parent.id;
    }
    const publicId = `c_${crypto.randomUUID().replace(/-/g, "")}`;
    await getDb().insert(articleComments).values({ publicId, postId: post.id, parentId, name: normalized.value.name, email: "", body: normalized.value.body });
    const comments = await publicComments(post.id, identity.hash);
    return withReaderCookie(Response.json({ enabled: true, comments, createdId: publicId }, { status: 201 }), identity.setCookie);
  } catch { return Response.json({ error: "Unable to publish your comment." }, { status: 500 }); }
}

async function publicComments(postId: number, visitorHash: string) {
  const rows = await getDb().select({ id: articleComments.id, publicId: articleComments.publicId, parentId: articleComments.parentId, name: articleComments.name, body: articleComments.body, createdAt: articleComments.createdAt }).from(articleComments).where(eq(articleComments.postId, postId)).orderBy(asc(articleComments.createdAt), asc(articleComments.id));
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const reactions = await getDb().select({ commentId: commentReactions.commentId, visitorHash: commentReactions.visitorHash, reaction: commentReactions.reaction }).from(commentReactions).where(inArray(commentReactions.commentId, ids));
  const publicIdByInternal = new Map(rows.map((row) => [row.id, row.publicId]));
  return rows.map((row) => {
    const matches = reactions.filter((reaction) => reaction.commentId === row.id);
    return {
      id: row.publicId,
      parentId: row.parentId ? publicIdByInternal.get(row.parentId) ?? null : null,
      name: row.name,
      body: row.body,
      createdAt: row.createdAt,
      likes: matches.filter((reaction) => reaction.reaction === "like").length,
      dislikes: matches.filter((reaction) => reaction.reaction === "dislike").length,
      reaction: matches.find((reaction) => reaction.visitorHash === visitorHash)?.reaction ?? null,
    };
  });
}
