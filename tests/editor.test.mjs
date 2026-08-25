import assert from "node:assert/strict";
import test from "node:test";
import { articleParagraphs, editorPath, editorSaveRequest } from "../domain/editor.ts";

test("routes new and existing editor saves only through owner APIs", () => {
  assert.deepEqual(editorSaveRequest(null), { endpoint: "/api/admin/posts", method: "POST" });
  assert.deepEqual(editorSaveRequest(42), { endpoint: "/api/admin/posts/42", method: "PATCH" });
});

test("builds the stable owner edit path after creation", () => {
  assert.equal(editorPath(42), "/writing/edit/42");
});

test("previews the same blank-line-separated paragraph model as published articles", () => {
  assert.deepEqual(articleParagraphs("First paragraph.\n\n Second paragraph. \n \nThird paragraph."), [
    "First paragraph.",
    "Second paragraph.",
    "Third paragraph.",
  ]);
  assert.deepEqual(articleParagraphs("  \n\n "), []);
});
