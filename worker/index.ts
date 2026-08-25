/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { initializeDatabase } from "../db/initialize";
import { ownerProtectionForRequest, verifyAccessRequest } from "./access-auth";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  OWNER_EMAIL?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    const protectedSurface = ownerProtectionForRequest(request);
    if (protectedSurface) {
      if (!env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_AUD || !env.OWNER_EMAIL) {
        return authErrorResponse(protectedSurface, 503, "Owner access is not configured.");
      }

      const auth = await verifyAccessRequest(request, {
        teamDomain: env.CF_ACCESS_TEAM_DOMAIN,
        audience: env.CF_ACCESS_AUD,
        ownerEmail: env.OWNER_EMAIL,
      });
      if (!auth.ok) {
        const message = auth.status === 403 ? "This account is not allowed." : "Sign in is required.";
        return authErrorResponse(protectedSurface, auth.status, message);
      }
    }

    await initializeDatabase(env.DB);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

function authErrorResponse(surface: "page" | "api", status: number, message: string): Response {
  const headers = new Headers({ "cache-control": "no-store" });
  if (status === 401) headers.set("www-authenticate", "Bearer");

  if (surface === "api") {
    headers.set("content-type", "application/json; charset=utf-8");
    return new Response(JSON.stringify({ error: message }), { status, headers });
  }

  headers.set("content-type", "text/plain; charset=utf-8");
  return new Response(message, { status, headers });
}

export default worker;
