export type EditorPost = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: "draft" | "published";
  commentsEnabled: boolean;
};

export function editorSaveRequest(postId: number | null): { endpoint: string; method: "POST" | "PATCH" } {
  return postId === null
    ? { endpoint: "/api/admin/posts", method: "POST" }
    : { endpoint: `/api/admin/posts/${postId}`, method: "PATCH" };
}

export function editorPath(postId: number): string {
  return `/writing/edit/${postId}`;
}

export function articleParagraphs(content: string): string[] {
  return content.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
}
