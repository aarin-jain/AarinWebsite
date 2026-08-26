export type CommentInput = { name?: unknown; email?: unknown; body?: unknown; parentId?: unknown; website?: unknown };
export type Reaction = "like" | "dislike";
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function normalizeCommentInput(input: CommentInput): ValidationResult<{ name: string; email: string; body: string; parentId: string | null }> {
  if (typeof input.website === "string" && input.website.trim()) return invalid("Comment could not be submitted.");
  const name = text(input.name);
  const email = text(input.email).toLowerCase();
  const body = text(input.body);
  const parentId = input.parentId === undefined || input.parentId === null || input.parentId === "" ? null : text(input.parentId);
  if (name.length < 2 || name.length > 80) return invalid("Name must be between 2 and 80 characters.");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return invalid("Enter a valid email address.");
  if (body.length < 3 || body.length > 2_000) return invalid("Comment must be between 3 and 2,000 characters.");
  if (parentId !== null && !isPublicCommentId(parentId)) return invalid("Reply target is invalid.");
  return { ok: true, value: { name, email, body, parentId } };
}

export function isPublicCommentId(value: string): boolean {
  return /^c_[A-Za-z0-9_-]{16,64}$/.test(value);
}

export function normalizeLikeAction(value: unknown): ValidationResult<boolean> {
  return typeof value === "boolean" ? { ok: true, value } : invalid("Liked must be true or false.");
}

export function normalizeReaction(value: unknown): ValidationResult<Reaction | null> {
  return value === null || value === "like" || value === "dislike" ? { ok: true, value } : invalid("Reaction must be like, dislike, or null.");
}

export async function readJsonObject(request: Request): Promise<ValidationResult<Record<string, unknown>>> {
  try {
    const value = await request.json();
    return typeof value === "object" && value !== null && !Array.isArray(value) ? { ok: true, value: value as Record<string, unknown> } : invalid("Request body must be a JSON object.");
  } catch { return invalid("Request body must be valid JSON."); }
}

function text(value: unknown) { return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : ""; }
function invalid<T>(error: string): ValidationResult<T> { return { ok: false, error }; }
