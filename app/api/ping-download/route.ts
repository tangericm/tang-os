/**
 * POST /api/ping-download — emails Eric when someone downloads a
 * resume. Fired by the client alongside the download; never blocks or
 * gates it. Requires the RESEND_API_KEY environment variable (set in
 * Vercel → Project → Settings → Environment Variables); without it
 * the route quietly does nothing, so the site works before setup.
 */
const ALLOWED = new Set(["resume-1p", "cv-full"]);

export async function POST(req: Request) {
  try {
    const { file } = await req.json();
    if (typeof file !== "string" || !ALLOWED.has(file)) {
      return new Response(null, { status: 400 });
    }

    const key = process.env.RESEND_API_KEY;
    if (!key) return new Response(null, { status: 204 });

    const referer = req.headers.get("referer") ?? "direct";
    const ua = req.headers.get("user-agent") ?? "unknown";

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "TangOS <onboarding@resend.dev>",
        to: ["eric.tang22@gmail.com"],
        subject: `📄 Resume downloaded on ericmtang.com (${file})`,
        text: [
          `Someone just downloaded: ${file === "resume-1p" ? "1-page resume" : "full CV"}`,
          `Time: ${new Date().toUTCString()}`,
          `Referrer: ${referer}`,
          `Browser: ${ua}`,
        ].join("\n"),
      }),
    });

    return new Response(null, { status: 204 });
  } catch {
    // never let notification plumbing surface an error to a visitor
    return new Response(null, { status: 204 });
  }
}
