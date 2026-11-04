/**
 * POST /api/ping-download, emails Eric when someone downloads a
 * resume. Fired by the client alongside the download; never blocks or
 * gates it. Requires the RESEND_API_KEY environment variable (set in
 * Vercel → Project → Settings → Environment Variables); without it
 * the route quietly does nothing, so the site works before setup.
 */
const ALLOWED = new Set(["resume-1p", "cv-full"]);
const MAX_BODY_BYTES = 1024;
const WINDOW_MS = 6 * 60 * 60 * 1000;
// A warm instance skips duplicate provider calls. The provider's idempotency key
// enforces the same email-send budget across cold starts and parallel instances.
const sentWindows = new Map<string, number>();

function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin"), host = req.headers.get("host");
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    if (parsed.origin !== origin || parsed.host.toLowerCase() !== host.toLowerCase()) return false;
    const loopback = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host);
    return parsed.protocol === "https:" || (parsed.protocol === "http:" && (loopback || process.env.NODE_ENV === "development"));
  } catch { return false; }
}

async function boundedBody(req: Request): Promise<string | Response> {
  if (Number(req.headers.get("content-length")) > MAX_BODY_BYTES) return new Response(null, { status: 413 });
  const reader = req.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0, expired = false;
  const timer = setTimeout(() => { expired = true; void reader.cancel().catch(() => {}); }, 2000);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        void reader.cancel().catch(() => {});
        return new Response(null, { status: 413 });
      }
      chunks.push(value);
    }
    if (expired) return new Response(null, { status: 408 });
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new TextDecoder().decode(bytes);
  } finally { clearTimeout(timer); }
}

export async function POST(req: Request) {
  // Origin/JSON checks stop cross-site browser requests, not bots. The shared
  // provider send budget below is still necessary for callers that forge headers.
  if (!sameOrigin(req)) return new Response(null, { status: 403 });
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers.get("content-type") ?? "")) return new Response(null, { status: 415 });
  let pendingFile: string | undefined, pendingWindow: number | undefined;
  try {
    const body = await boundedBody(req);
    if (body instanceof Response) return body;
    let payload: unknown;
    try { payload = JSON.parse(body); } catch { return new Response(null, { status: 400 }); }
    const file = payload && typeof payload === "object" && "file" in payload ? payload.file : undefined;
    if (typeof file !== "string" || !ALLOWED.has(file)) {
      return new Response(null, { status: 400 });
    }

    const key = process.env.RESEND_API_KEY;
    if (!key) return new Response(null, { status: 204 });

    const windowId = Math.floor(Date.now() / WINDOW_MS);
    if (sentWindows.get(file) === windowId) return new Response(null, { status: 204 });
    sentWindows.set(file, windowId);
    pendingFile = file; pendingWindow = windowId;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `tangos-download/${file}/${windowId}`,
      },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        from: "TangOS <onboarding@resend.dev>",
        to: ["eric.tang22@gmail.com"],
        subject: `📄 Resume downloaded on ericmtang.com (${file})`,
        text: [
          `At least one visitor downloaded: ${file === "resume-1p" ? "1-page resume" : "full CV"}`,
          `Six-hour window starting: ${new Date(windowId * WINDOW_MS).toUTCString()}`,
        ].join("\n"),
      }),
    });
    if (!response.ok && sentWindows.get(file) === windowId) sentWindows.delete(file);

    return new Response(null, { status: 204 });
  } catch {
    if (pendingFile && sentWindows.get(pendingFile) === pendingWindow) sentWindows.delete(pendingFile);
    // never let notification plumbing surface an error to a visitor
    return new Response(null, { status: 204 });
  }
}
