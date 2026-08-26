import { env } from "cloudflare:workers";
import { and, count, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { articleLikes } from "../../../../../db/schema";
import { normalizeLikeAction, readJsonObject } from "../../../../../domain/engagement";
import { enforceRateLimit, publishedPost } from "../../../../../services/engagement";
import { readerIdentity, withReaderCookie } from "../../../../../services/reader-identity";

type Context = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const post = await publishedPost((await params).slug);
    if (!post) return Response.json({ error: "Article not found." }, { status: 404 });
    const identity = await readerIdentity(request);
    return withReaderCookie(Response.json(await likeState(post.id, identity.hash)), identity.setCookie);
  } catch { return Response.json({ error: "Unable to load likes." }, { status: 500 }); }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const post = await publishedPost((await params).slug);
    if (!post) return Response.json({ error: "Article not found." }, { status: 404 });
    const body = await readJsonObject(request);
    if (!body.ok) return Response.json({ error: body.error }, { status: 400 });
    const action = normalizeLikeAction(body.value.liked);
    if (!action.ok) return Response.json({ error: action.error }, { status: 400 });
    const identity = await readerIdentity(request);
    if (!await enforceRateLimit(env.DB, `article-like:${identity.hash}`, 30, 60_000)) return Response.json({ error: "Too many like changes. Try again shortly." }, { status: 429 });

    if (action.value) {
      await getDb().insert(articleLikes).values({ postId: post.id, visitorHash: identity.hash }).onConflictDoNothing();
    } else {
      await getDb().delete(articleLikes).where(and(eq(articleLikes.postId, post.id), eq(articleLikes.visitorHash, identity.hash)));
    }
    return withReaderCookie(Response.json(await likeState(post.id, identity.hash)), identity.setCookie);
  } catch { return Response.json({ error: "Unable to save your like." }, { status: 500 }); }
}

async function likeState(postId: number, visitorHash: string) {
  const [[total], liked] = await Promise.all([
    getDb().select({ count: count() }).from(articleLikes).where(eq(articleLikes.postId, postId)),
    getDb().select({ id: articleLikes.id }).from(articleLikes).where(and(eq(articleLikes.postId, postId), eq(articleLikes.visitorHash, visitorHash))).limit(1),
  ]);
  return { count: total.count, liked: liked.length > 0 };
}
