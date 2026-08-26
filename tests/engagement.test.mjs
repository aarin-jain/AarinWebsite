import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCommentInput, normalizeLikeAction, normalizeReaction } from "../domain/engagement.ts";
import { readerIdentity, withReaderCookie } from "../services/reader-identity.ts";

test("normalizes valid comments and keeps email private-ready", () => {
  assert.deepEqual(normalizeCommentInput({ name: "  Aarin  ", email: " AARIN@EXAMPLE.COM ", body: "  Thoughtful   response. ", parentId: "c_1234567890abcdef" }), {
    ok: true,
    value: { name: "Aarin", email: "aarin@example.com", body: "Thoughtful response.", parentId: "c_1234567890abcdef" },
  });
});

test("rejects invalid comments, honeypots, and reply targets", () => {
  const cases = [
    { name: "A", email: "a@example.com", body: "Valid body" },
    { name: "Aarin", email: "invalid", body: "Valid body" },
    { name: "Aarin", email: "a@example.com", body: "no" },
    { name: "Aarin", email: "a@example.com", body: "Valid body", parentId: "42" },
    { name: "Aarin", email: "a@example.com", body: "Valid body", website: "spam.example" },
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
