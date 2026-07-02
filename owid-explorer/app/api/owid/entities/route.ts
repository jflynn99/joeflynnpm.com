import { NextRequest, NextResponse } from "next/server";
import { fetchChartEntities, isValidSlug } from "@/lib/owid/client";

const CACHE = "public, s-maxage=86400, stale-while-revalidate=604800";

// GET /api/owid/entities?slug=life-expectancy
// Available entities + year range for a chart, derived server-side from the
// full CSV (there is no cheap OWID endpoint for this).
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") ?? "";
  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: "invalid slug" }, { status: 400 });
  }
  try {
    const data = await fetchChartEntities(slug);
    return NextResponse.json(data, { headers: { "Cache-Control": CACHE } });
  } catch {
    return NextResponse.json({ error: `could not load entities for "${slug}"` }, { status: 502 });
  }
}
