import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";
import {
  clearJwksCacheForTests,
  ownerProtectionForRequest,
  verifyAccessRequest,
} from "../worker/access-auth.ts";

globalThis.crypto ??= webcrypto;

const now = 1_800_000_000;
const issuer = "https://aarin.cloudflareaccess.com";
const config = {
  teamDomain: issuer,
  audience: "website-audience",
  ownerEmail: "aarinj@gmail.com",
};

const { privateKey, publicKey } = await crypto.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
  true,
  ["sign", "verify"],
);
const publicJwk = await crypto.subtle.exportKey("jwk", publicKey);
publicJwk.kid = "test-key";
publicJwk.alg = "RS256";
publicJwk.use = "sig";

test.beforeEach(() => clearJwksCacheForTests());

test("identifies every current owner-only route without blocking public reads", () => {
  const cases = [
    ["GET", "/admin", "page"],
    ["GET", "/admin/", "page"],
    ["GET", "/writing/new", "page"],
    ["GET", "/writing/edit/42", "page"],
    ["GET", "/api/admin/posts", "api"],
    ["POST", "/api/admin/posts", "api"],
    ["PATCH", "/api/admin/posts/42", "api"],
    ["DELETE", "/api/admin/posts/42", "api"],
    ["PATCH", "/api/admin/messages/42", "api"],
    ["DELETE", "/api/admin/messages/42", "api"],
    ["GET", "/", null],
    ["GET", "/writing", null],
    ["GET", "/writing/an-article", null],
    ["GET", "/api/posts", null],
    ["POST", "/api/posts", null],
    ["POST", "/api/contact", null],
  ];

  for (const [method, pathname, expected] of cases) {
    assert.equal(ownerProtectionForRequest(new Request(`https://example.com${pathname}`, { method })), expected, `${method} ${pathname}`);
  }
});

test("accepts a valid owner token from the Access assertion header", async () => {
  const token = await signToken();
  const result = await verifyAccessRequest(
    new Request("https://example.com/admin", { headers: { "Cf-Access-Jwt-Assertion": token } }),
    config,
    { fetcher: jwksFetch(), nowSeconds: now },
  );

  assert.deepEqual(result, { ok: true, identity: { email: "aarinj@gmail.com", subject: "owner-123" } });
});

test("accepts the signed Access cookie for an owner API endpoint", async () => {
  const token = await signToken();
  const result = await verifyAccessRequest(
    new Request("https://example.com/api/admin/posts", { method: "POST", headers: { cookie: `other=value; CF_Authorization=${token}` } }),
    config,
    { fetcher: jwksFetch(), nowSeconds: now },
  );

  assert.equal(result.ok, true);
});

test("rejects a missing token without requesting signing keys", async () => {
  let fetches = 0;
  const result = await verifyAccessRequest(new Request("https://example.com/admin"), config, {
    fetcher: async () => { fetches += 1; return new Response(); },
    nowSeconds: now,
  });

  assert.deepEqual(result, { ok: false, status: 401, reason: "missing_token" });
  assert.equal(fetches, 0);
});

test("rejects an authenticated account that is not the owner", async () => {
  const token = await signToken({ email: "someone@example.com" });
  const result = await verify(token);
  assert.deepEqual(result, { ok: false, status: 403, reason: "owner_only" });
});

test("rejects invalid signatures", async () => {
  const token = await signToken();
  const [header, payload] = token.split(".");
  const forgedPayload = encodeJson({ ...JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))), sub: "forged-owner" });
  const result = await verify(`${header}.${forgedPayload}.${token.split(".")[2]}`);
  assert.deepEqual(result, { ok: false, status: 401, reason: "invalid_signature" });
});

test("rejects wrong issuer, wrong audience, expired, and not-yet-active tokens", async (t) => {
  const cases = [
    ["issuer", { iss: "https://attacker.example.com" }, "invalid_issuer"],
    ["audience", { aud: "another-app" }, "invalid_audience"],
    ["expiration", { exp: now }, "expired_token"],
    ["not before", { nbf: now + 1 }, "token_not_active"],
  ];

  for (const [name, overrides, reason] of cases) {
    await t.test(name, async () => {
      clearJwksCacheForTests();
      const result = await verify(await signToken(overrides));
      assert.deepEqual(result, { ok: false, status: 401, reason });
    });
  }
});

test("refreshes cached signing keys when the token uses an unknown key id", async () => {
  const token = await signToken();
  let fetches = 0;
  const fetcher = async () => {
    fetches += 1;
    return Response.json({ keys: fetches === 1 ? [] : [publicJwk] });
  };

  const result = await verifyAccessRequest(
    new Request("https://example.com/admin", { headers: { "cf-access-jwt-assertion": token } }),
    config,
    { fetcher, nowSeconds: now },
  );

  assert.equal(result.ok, true);
  assert.equal(fetches, 2);
});

async function verify(token) {
  return verifyAccessRequest(
    new Request("https://example.com/admin", { headers: { "cf-access-jwt-assertion": token } }),
    config,
    { fetcher: jwksFetch(), nowSeconds: now },
  );
}

function jwksFetch() {
  return async (url) => {
    assert.equal(String(url), `${issuer}/cdn-cgi/access/certs`);
    return Response.json({ keys: [publicJwk] });
  };
}

async function signToken(overrides = {}) {
  const header = encodeJson({ alg: "RS256", kid: "test-key", typ: "JWT" });
  const payload = encodeJson({
    iss: issuer,
    aud: config.audience,
    sub: "owner-123",
    email: "aarinj@gmail.com",
    iat: now - 60,
    exp: now + 3600,
    ...overrides,
  });
  const input = `${header}.${payload}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(input));
  return `${input}.${base64UrlEncode(new Uint8Array(signature))}`;
}

function encodeJson(value) {
  return base64UrlEncode(new TextEncoder().encode(JSON.stringify(value)));
}

function base64UrlEncode(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

function base64UrlDecode(value) {
  return new Uint8Array(Buffer.from(value, "base64url"));
}
