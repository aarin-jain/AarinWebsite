import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPostUpdate,
  isUniqueConstraintError,
  normalizeNewPostInput,
  parsePostId,
  readPostMutationInput,
} from "../domain/posts.ts";

const now = "2026-08-24T20:00:00.000Z";
const existingDraft = {
  title: "Existing title",
  slug: "existing-title",
  excerpt: "Existing description",
  content: "Existing article content that is comfortably over forty characters.",
  status: "draft",
  publishedAt: null,
};

test("normalizes a new post and defaults its status to draft", () => {
  const result = normalizeNewPostInput({
    title: "  A clear title  ",
    excerpt: "  A useful description.  ",
    content: "  Article content that is comfortably longer than forty characters.  ",
  });

  assert.deepEqual(result, {
    ok: true,
    value: {
      title: "A clear title",
      excerpt: "A useful description.",
      content: "Article content that is comfortably longer than forty characters.",
      status: "draft",
    },
  });
});

test("accepts JSON objects and rejects malformed or non-object request bodies", async () => {
  const valid = await readPostMutationInput(new Request("https://example.com", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "A title" }),
  }));
  assert.deepEqual(valid, { ok: true, value: { title: "A title" } });

  const malformed = await readPostMutationInput(new Request("https://example.com", { method: "POST", body: "{" }));
  assert.deepEqual(malformed, { ok: false, error: "Request body must be valid JSON." });

  const array = await readPostMutationInput(new Request("https://example.com", { method: "POST", body: "[]" }));
  assert.deepEqual(array, { ok: false, error: "Request body must be a JSON object." });
});

test("rejects invalid title, description, content, and status", async (t) => {
  const valid = {
    title: "Valid title",
    excerpt: "Valid description",
    content: "Valid article content that is longer than the minimum length.",
    status: "draft",
  };
  const cases = [
    ["blank title", { ...valid, title: "   " }, "Title must"],
    ["long title", { ...valid, title: "x".repeat(121) }, "Title must"],
    ["blank description", { ...valid, excerpt: "" }, "Description must"],
    ["long description", { ...valid, excerpt: "x".repeat(241) }, "Description must"],
    ["short article", { ...valid, content: "Too short" }, "Article must"],
    ["invalid status", { ...valid, status: "scheduled" }, "Status must"],
  ];

  for (const [name, input, message] of cases) {
    await t.test(name, () => {
      const result = normalizeNewPostInput(input);
      assert.equal(result.ok, false);
      assert.match(result.error, new RegExp(message));
    });
  }
});

test("updates article fields without returning or changing the stable slug", () => {
  const result = buildPostUpdate(existingDraft, {
    title: "  Revised title  ",
    excerpt: "Revised description",
    content: "Revised article content that is comfortably over forty characters.",
  }, now);

  assert.equal(result.ok, true);
  assert.equal(result.value.title, "Revised title");
  assert.equal(result.value.updatedAt, now);
  assert.equal("slug" in result.value, false);
  assert.equal(result.value.publishedAt, null);
});

test("supports the existing status-only dashboard mutation", () => {
  const result = buildPostUpdate(existingDraft, { status: "published" }, now);
  assert.equal(result.ok, true);
  assert.equal(result.value.title, existingDraft.title);
  assert.equal(result.value.status, "published");
});

test("sets publishedAt only on first publication and preserves it afterward", () => {
  const firstPublication = buildPostUpdate(existingDraft, { status: "published" }, now);
  assert.equal(firstPublication.ok, true);
  assert.equal(firstPublication.value.publishedAt, now);

  const originalPublishedAt = "2026-08-01T12:00:00.000Z";
  const published = { ...existingDraft, status: "published", publishedAt: originalPublishedAt };
  const edit = buildPostUpdate(published, { title: "Edited after publication" }, now);
  const unpublish = buildPostUpdate(published, { status: "draft" }, now);

  assert.equal(edit.ok, true);
  assert.equal(edit.value.publishedAt, originalPublishedAt);
  assert.equal(unpublish.ok, true);
  assert.equal(unpublish.value.publishedAt, originalPublishedAt);
});

test("rejects empty and invalid partial updates", () => {
  assert.deepEqual(buildPostUpdate(existingDraft, {}, now), {
    ok: false,
    error: "Provide at least one field to update.",
  });

  const invalid = buildPostUpdate(existingDraft, { content: "short" }, now);
  assert.equal(invalid.ok, false);
  assert.match(invalid.error, /Article must/);
});

test("parses only positive safe integer post IDs", () => {
  assert.equal(parsePostId("1"), 1);
  assert.equal(parsePostId("2048"), 2048);
  for (const value of ["0", "-1", "1.5", "01", "abc", "9007199254740992"]) {
    assert.equal(parsePostId(value), null, value);
  }
});

test("recognizes SQLite unique constraint failures without classifying unrelated errors", () => {
  assert.equal(isUniqueConstraintError(new Error("UNIQUE constraint failed: posts.slug")), true);
  assert.equal(isUniqueConstraintError(new Error("SQLITE_CONSTRAINT_UNIQUE")), true);
  assert.equal(isUniqueConstraintError(new Error("database unavailable")), false);
  assert.equal(isUniqueConstraintError("UNIQUE constraint failed"), false);
});
