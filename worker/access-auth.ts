export type AccessAuthConfig = {
  teamDomain: string;
  audience: string;
  ownerEmail: string;
};

export type AccessIdentity = {
  email: string;
  subject: string;
};

export type AccessAuthResult =
  | { ok: true; identity: AccessIdentity }
  | { ok: false; status: 401 | 403; reason: string };

type VerifyOptions = {
  fetcher?: typeof fetch;
  nowSeconds?: number;
};

type JwtHeader = {
  alg?: unknown;
  kid?: unknown;
};

type JwtPayload = {
  aud?: unknown;
  email?: unknown;
  exp?: unknown;
  iss?: unknown;
  nbf?: unknown;
  sub?: unknown;
};

type Jwks = { keys: JsonWebKey[] };

const JWKS_CACHE_TTL_MS = 5 * 60 * 1000;
const jwksCache = new Map<string, { expiresAt: number; keys: JsonWebKey[] }>();

export function ownerProtectionForRequest(request: Request): "page" | "api" | null {
  const { pathname } = new URL(request.url);
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  if (
    normalizedPath === "/admin" ||
    normalizedPath.startsWith("/admin/") ||
    normalizedPath === "/writing/new" ||
    normalizedPath.startsWith("/writing/new/") ||
    normalizedPath === "/writing/edit" ||
    normalizedPath.startsWith("/writing/edit/")
  ) {
    return "page";
  }

  if (
    normalizedPath === "/api/admin" ||
    normalizedPath.startsWith("/api/admin/")
  ) {
    return "api";
  }

  return null;
}

export async function verifyAccessRequest(
  request: Request,
  config: AccessAuthConfig,
  options: VerifyOptions = {},
): Promise<AccessAuthResult> {
  const token = accessTokenFromRequest(request);
  if (!token) return unauthorized("missing_token");

  const segments = token.split(".");
  if (segments.length !== 3 || segments.some((segment) => !segment)) {
    return unauthorized("malformed_token");
  }

  let header: JwtHeader;
  let payload: JwtPayload;
  let signature: Uint8Array;
  try {
    header = decodeJsonSegment<JwtHeader>(segments[0]);
    payload = decodeJsonSegment<JwtPayload>(segments[1]);
    signature = decodeBase64Url(segments[2]);
  } catch {
    return unauthorized("malformed_token");
  }

  if (header.alg !== "RS256" || typeof header.kid !== "string" || !header.kid) {
    return unauthorized("unsupported_token");
  }

  let issuer: string;
  try {
    issuer = normalizeTeamDomain(config.teamDomain);
  } catch {
    return unauthorized("invalid_configuration");
  }

  const fetcher = options.fetcher ?? fetch;
  try {
    const key = await signingKey(issuer, header.kid, fetcher);
    const verified = await crypto.subtle.verify(
      { name: "RSASSA-PKCS1-v1_5" },
      key,
      signature,
      new TextEncoder().encode(`${segments[0]}.${segments[1]}`),
    );
    if (!verified) return unauthorized("invalid_signature");
  } catch {
    return unauthorized("key_verification_failed");
  }

  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (payload.iss !== issuer) return unauthorized("invalid_issuer");
  if (!hasAudience(payload.aud, config.audience)) return unauthorized("invalid_audience");
  if (typeof payload.exp !== "number" || payload.exp <= now) return unauthorized("expired_token");
  if (typeof payload.nbf === "number" && payload.nbf > now) return unauthorized("token_not_active");
  if (typeof payload.email !== "string" || !payload.email.trim()) return unauthorized("missing_email");

  const email = payload.email.trim().toLowerCase();
  if (email !== config.ownerEmail.trim().toLowerCase()) {
    return { ok: false, status: 403, reason: "owner_only" };
  }

  return {
    ok: true,
    identity: {
      email,
      subject: typeof payload.sub === "string" ? payload.sub : email,
    },
  };
}

export function clearJwksCacheForTests(): void {
  jwksCache.clear();
}

function accessTokenFromRequest(request: Request): string | null {
  const assertion = request.headers.get("cf-access-jwt-assertion")?.trim();
  if (assertion) return assertion;

  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  for (const part of cookie.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === "CF_Authorization") {
      const value = rawValue.join("=").trim();
      return value || null;
    }
  }
  return null;
}

function normalizeTeamDomain(value: string): string {
  const candidate = value.includes("://") ? value : `https://${value}`;
  const url = new URL(candidate);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("Invalid Cloudflare Access team domain");
  }
  return url.origin;
}

function hasAudience(value: unknown, expected: string): boolean {
  if (typeof value === "string") return value === expected;
  return Array.isArray(value) && value.some((item) => item === expected);
}

async function signingKey(issuer: string, kid: string, fetcher: typeof fetch): Promise<CryptoKey> {
  const jwksUrl = `${issuer}/cdn-cgi/access/certs`;
  let keys = await loadJwks(jwksUrl, fetcher, false);
  let jwk = keys.find((candidate) => candidate.kid === kid);

  if (!jwk) {
    keys = await loadJwks(jwksUrl, fetcher, true);
    jwk = keys.find((candidate) => candidate.kid === kid);
  }
  if (!jwk) throw new Error("Signing key not found");

  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

async function loadJwks(jwksUrl: string, fetcher: typeof fetch, force: boolean): Promise<JsonWebKey[]> {
  const cached = jwksCache.get(jwksUrl);
  if (!force && cached && cached.expiresAt > Date.now()) return cached.keys;

  const response = await fetcher(jwksUrl, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error("Unable to load Cloudflare Access signing keys");
  const body = (await response.json()) as Partial<Jwks>;
  if (!Array.isArray(body.keys)) throw new Error("Invalid Cloudflare Access signing keys");

  jwksCache.set(jwksUrl, { expiresAt: Date.now() + JWKS_CACHE_TTL_MS, keys: body.keys });
  return body.keys;
}

function decodeJsonSegment<T>(segment: string): T {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(segment))) as T;
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function unauthorized(reason: string): AccessAuthResult {
  return { ok: false, status: 401, reason };
}
