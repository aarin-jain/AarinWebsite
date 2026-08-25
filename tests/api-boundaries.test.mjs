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
