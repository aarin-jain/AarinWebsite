export type PostStatus = "draft" | "published";

export type PostMutationInput = {
  title?: unknown;
  excerpt?: unknown;
  content?: unknown;
  status?: unknown;
  commentsEnabled?: unknown;
};

export type NormalizedPostInput = {
  title: string;
  excerpt: string;
  content: string;
  status: PostStatus;
  commentsEnabled: boolean;
};

export type ExistingPostForUpdate = NormalizedPostInput & {
  slug: string;
  publishedAt: string | null;
};

export type PostInputResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const TITLE_MAX_LENGTH = 120;
const EXCERPT_MAX_LENGTH = 240;
const CONTENT_MIN_LENGTH = 40;
const CONTENT_MAX_LENGTH = 100_000;

export async function readPostMutationInput(request: Request): Promise<PostInputResult<PostMutationInput>> {
  try {
    const input = await request.json();
    if (!isRecord(input) || Array.isArray(input)) return invalid("Request body must be a JSON object.");
    return { ok: true, value: input };
  } catch {
    return invalid("Request body must be valid JSON.");
  }
}

export function normalizeNewPostInput(input: PostMutationInput): PostInputResult<NormalizedPostInput> {
  const title = normalizedText(input.title);
  if (!title || title.length > TITLE_MAX_LENGTH) {
    return invalid(`Title must be between 1 and ${TITLE_MAX_LENGTH} characters.`);
  }

  const excerpt = normalizedText(input.excerpt);
  if (!excerpt || excerpt.length > EXCERPT_MAX_LENGTH) {
    return invalid(`Description must be between 1 and ${EXCERPT_MAX_LENGTH} characters.`);
  }

  const content = normalizedText(input.content);
  if (content.length < CONTENT_MIN_LENGTH || content.length > CONTENT_MAX_LENGTH) {
    return invalid(`Article must be between ${CONTENT_MIN_LENGTH} and ${CONTENT_MAX_LENGTH} characters.`);
  }

  const status = input.status === undefined ? "draft" : input.status;
  if (!isPostStatus(status)) return invalid("Status must be draft or published.");
  const commentsEnabled = input.commentsEnabled === undefined ? true : input.commentsEnabled;
  if (typeof commentsEnabled !== "boolean") return invalid("Comments enabled must be true or false.");

  return { ok: true, value: { title, excerpt, content, status, commentsEnabled } };
}

export function buildPostUpdate(
  existing: ExistingPostForUpdate,
  input: PostMutationInput,
  now: string,
): PostInputResult<Omit<NormalizedPostInput, never> & { publishedAt: string | null; updatedAt: string }> {
  if (!hasEditableField(input)) return invalid("Provide at least one field to update.");

  const candidate: PostMutationInput = {
    title: input.title === undefined ? existing.title : input.title,
    excerpt: input.excerpt === undefined ? existing.excerpt : input.excerpt,
    content: input.content === undefined ? existing.content : input.content,
    status: input.status === undefined ? existing.status : input.status,
    commentsEnabled: input.commentsEnabled === undefined ? existing.commentsEnabled : input.commentsEnabled,
  };
  const normalized = normalizeNewPostInput(candidate);
  if (!normalized.ok) return normalized;

  const publishedAt =
    normalized.value.status === "published"
      ? existing.publishedAt ?? now
      : existing.publishedAt;

  return {
    ok: true,
    value: {
      ...normalized.value,
      publishedAt,
      updatedAt: now,
    },
  };
}

export function parsePostId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

export function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && /(?:UNIQUE constraint failed|SQLITE_CONSTRAINT(?:_UNIQUE)?)/i.test(error.message);
}

function normalizedText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isPostStatus(value: unknown): value is PostStatus {
  return value === "draft" || value === "published";
}

function hasEditableField(input: PostMutationInput): boolean {
  return input.title !== undefined || input.excerpt !== undefined || input.content !== undefined || input.status !== undefined || input.commentsEnabled !== undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function invalid<T>(error: string): PostInputResult<T> {
  return { ok: false, error };
}
