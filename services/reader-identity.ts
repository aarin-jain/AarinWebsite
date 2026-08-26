const COOKIE_NAME = "aj_reader";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export async function readerIdentity(request: Request): Promise<{ hash: string; setCookie?: string }> {
  const existing = readCookie(request.headers.get("cookie"), COOKIE_NAME);
  const token = existing && TOKEN_PATTERN.test(existing) ? existing : randomToken();
  const hash = await sha256(token);
  return existing === token ? { hash } : { hash, setCookie: `${COOKIE_NAME}=${token}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax` };
}

export function withReaderCookie(response: Response, setCookie?: string): Response {
  if (setCookie) response.headers.append("Set-Cookie", setCookie);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function readCookie(header: string | null, name: string) {
  return header?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? null;
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return base64Url(bytes);
}

async function sha256(value: string) {
  return base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
