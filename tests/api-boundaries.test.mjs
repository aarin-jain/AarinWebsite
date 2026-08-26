import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publicPostsRoute = new URL("../app/api/posts/route.ts", import.meta.url);
const adminPostsRoute = new URL("../app/api/admin/posts/route.ts", import.meta.url);
const editor = new URL("../app/writing/new/post-editor.tsx", import.meta.url);

test("keeps public posts read-only and moves creation behind the admin boundary", async () => {
  const [publicSource, adminSource, editorSource] = await Promise.all([
    readFile(publicPostsRoute, "utf8"),
    readFile(adminPostsRoute, "utf8"),
    readFile(editor, "utf8"),
  ]);

  assert.match(publicSource, /export async function GET\(/);
  assert.doesNotMatch(publicSource, /export async function (?:POST|PATCH|PUT|DELETE)\(/);
  assert.match(adminSource, /export async function POST\(/);
  assert.doesNotMatch(editorSource, /fetch\(["']\/api\/posts["']/);
  assert.match(editorSource, /editorSaveRequest/);
});

test("keeps comment deletion owner-only while public engagement remains narrowly scoped", async () => {
  const [likes, comments, reactions, adminDelete] = await Promise.all([
    readFile(new URL("../app/api/posts/[slug]/likes/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/posts/[slug]/comments/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/posts/[slug]/comments/[commentId]/reaction/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/comments/[id]/route.ts", import.meta.url), "utf8"),
  ]);
  for (const source of [likes, comments, reactions]) assert.doesNotMatch(source, /export async function DELETE/);
  assert.match(adminDelete, /export async function DELETE/);
  assert.match(comments, /post\.commentsEnabled/);
  assert.match(likes, /articleLikes.*onConflictDoNothing/s);
});
