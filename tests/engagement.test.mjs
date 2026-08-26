import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCommentInput, normalizeLikeAction, normalizeReaction } from "../domain/engagement.ts";
import { readerIdentity, withReaderCookie } from "../services/reader-identity.ts";

test("normalizes valid comments without requiring an email", () => {
  assert.deepEqual(normalizeCommentInput({ name: "  Aarin  ", body: "  Thoughtful   response. ", parentId: "c_1234567890abcdef" }), {
    ok: true,
    value: { name: "Aarin", body: "Thoughtful response.", parentId: "c_1234567890abcdef" },
  });
});

test("defaults a missing commenter name to Anonymous", () => {
  assert.deepEqual(normalizeCommentInput({ body: "A comment without a name." }), {
    ok: true,
    value: { name: "Anonymous", body: "A comment without a name.", parentId: null },
  });
});

test("rejects invalid comments, honeypots, and reply targets", () => {
  const cases = [
    { name: "A", body: "Valid body" },
    { name: "Aarin", body: "no" },
    { name: "Aarin", body: "Valid body", parentId: "42" },
    { name: "Aarin", body: "Valid body", website: "spam.example" },
  ];
  for (const input of cases) assert.equal(normalizeCommentInput(input).ok, false);
});

test("validates article likes and three-state comment reactions", () => {
  assert.deepEqual(normalizeLikeAction(true), { ok: true, value: true });
  assert.deepEqual(normalizeLikeAction("true"), { ok: false, error: "Liked must be true or false." });
  for (const value of ["like", "dislike", null]) assert.equal(normalizeReaction(value).ok, true);
  assert.equal(normalizeReaction("love").ok, false);
});

test("issues a secure reader cookie and recognizes it on the next request", async () => {
  const first = await readerIdentity(new Request("https://example.com"));
  assert.ok(first.setCookie);
  assert.match(first.setCookie, /HttpOnly; Secure; SameSite=Lax/);
  const cookie = first.setCookie.split(";")[0];
  const second = await readerIdentity(new Request("https://example.com", { headers: { cookie } }));
  assert.equal(second.hash, first.hash);
  assert.equal(second.setCookie, undefined);
  const response = withReaderCookie(Response.json({ ok: true }), first.setCookie);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});
