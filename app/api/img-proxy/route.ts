export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_DOMAINS = [
  "musicbusinessworldwide.com",
  "hypebot.com",
  "musictech.com",
  "soundonsound.com",
  "kvraudio.com",
  "bedroomproducersblog.com",
  "musicradar.com",
  "cdm.link",
  "synthtopia.com",
  "attackmagazine.com",
  "factmag.com",
  "residentadvisor.net",
  "substack.com",
  "medium.com",
  "theverge.com",
  "rollingstone.com",
  "billboard.com",
  "pitchfork.com",
];

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url");
  if (!urlParam) return new NextResponse("Missing url", { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(urlParam);
  } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  // Only HTTPS — blocks file://, http://, ftp://, etc.
  if (parsed.protocol !== "https:") {
    return new NextResponse("Only HTTPS URLs allowed", { status: 400 });
  }

  // Block internal/private IP ranges
  const hostname = parsed.hostname;
  if (
    hostname === "localhost" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("169.254.") || // AWS metadata
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local")
  ) {
    return new NextResponse("Domain not allowed", { status: 403 });
  }

  // Whitelist — only fetch from known news/image sources
  const allowed = ALLOWED_DOMAINS.some((d) => hostname.includes(d));
  if (!allowed) {
    return new NextResponse("Domain not allowed", { status: 403 });
  }

  try {
    const res = await fetch(parsed.toString(), {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return new NextResponse("Upstream error", { status: 502 });

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      return new NextResponse("Only images allowed", { status: 400 });
    }

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Failed to fetch image", { status: 502 });
  }
}
