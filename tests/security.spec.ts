import { expect, test } from "@playwright/test";
import { POST } from "../app/api/ping-download/route";

function notification(body = JSON.stringify({ file: "resume-1p" }), headers: Record<string, string> = {}) {
  return new Request("https://ericmtang.com/api/ping-download", {
    method: "POST", headers: { Host: "ericmtang.com", Origin: "https://ericmtang.com", "Content-Type": "application/json", ...headers }, body,
  });
}

test("download notifications reject cross-origin, non-JSON, oversized, and malformed requests", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "test-not-a-real-key";
  let sends = 0;
  globalThis.fetch = async () => { sends++; return new Response("{}", { status: 200 }); };
  try {
    expect((await POST(notification(undefined, { Origin: "https://attacker.invalid" }))).status).toBe(403);
    expect((await POST(notification(undefined, { "Content-Type": "text/plain" }))).status).toBe(415);
    expect((await POST(notification("x".repeat(1025)))).status).toBe(413);
    expect((await POST(notification("not json"))).status).toBe(400);
    expect((await POST(notification(JSON.stringify({ file: "other" })))).status).toBe(400);
    expect(sends).toBe(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalKey;
  }
});

test("notification retries share a provider idempotency key and payload across instances", async () => {
  const originalFetch = globalThis.fetch, originalNow = Date.now;
  const originalKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "test-not-a-real-key";
  const sends: RequestInit[] = [];
  globalThis.fetch = async (_url, options) => { sends.push(options!); return new Response("{}", { status: sends.length === 1 ? 503 : 200 }); };
  Date.now = () => 1793721600000;
  try {
    expect((await POST(notification(undefined, { "User-Agent": "first" }))).status).toBe(204);
    expect((await POST(notification(undefined, { "User-Agent": "second", Referer: "https://private.invalid/path" }))).status).toBe(204);
    const key = new Headers(sends[0].headers).get("Idempotency-Key");
    expect(key).toMatch(/^tangos-download\/resume-1p\/\d+$/);
    expect(new Headers(sends[1].headers).get("Idempotency-Key")).toBe(key);
    expect(sends[1].body).toBe(sends[0].body);
    expect(String(sends[0].body)).not.toContain("private.invalid");
    expect(sends[0].signal).toBeTruthy();
    expect((await POST(notification())).status).toBe(204);
    expect(sends).toHaveLength(2); // A successful warm-instance send also suppresses repeat API calls.
  } finally {
    globalThis.fetch = originalFetch; Date.now = originalNow;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalKey;
  }
});

test("notifications remain optional without a configured provider key", async () => {
  const originalKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  try { expect((await POST(notification())).status).toBe(204); }
  finally { if (originalKey !== undefined) process.env.RESEND_API_KEY = originalKey; }
});

test("notification origins use the public Host rather than Next's internal URL", async () => {
  const request = new Request("http://localhost:3000/api/ping-download", {
    method: "POST", headers: { Host: "portfolio.invalid", Origin: "https://portfolio.invalid", "Content-Type": "application/json" },
    body: JSON.stringify({ file: "not-an-approved-file" }),
  });
  expect((await POST(request)).status).toBe(400); // Valid origin, invalid file; no email can be sent.
});

test("production responses enforce browser security controls", async ({ request }) => {
  for (const path of ["/", "/play", "/resume", "/engine/stockfish-19-lite-single.js"]) {
    const response = await request.get(path);
    expect(response.ok()).toBe(true);
    const headers = response.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"]).toContain("object-src 'none'");
    expect(headers["content-security-policy"]).toContain("'wasm-unsafe-eval'");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["x-powered-by"]).toBeUndefined();
  }
});

test("the unused image transformation endpoint is disabled while original images work", async ({ request }) => {
  const response = await request.get("/_next/image?url=%2Ftrack-seq.webp%23audit&w=64&q=75");
  expect(response.status()).toBe(404);
  expect((await request.get("/track-seq.webp")).ok()).toBe(true);
});

test("same-origin proxy aliases reach validation and cross-origin aliases are blocked", async ({ request }) => {
  const options = { headers: { Host: "portfolio.invalid", Origin: "https://portfolio.invalid" }, data: { file: "not-an-approved-file" } };
  expect((await request.post("/api/ping-download", options)).status()).toBe(400);
  expect((await request.post("/api/ping-download", { ...options, headers: { ...options.headers, Origin: "https://attacker.invalid" } })).status()).toBe(403);
});
