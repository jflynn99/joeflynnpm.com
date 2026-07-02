import { NextRequest, NextResponse } from "next/server";
import { fetchChartCsv, fetchChartMetadata, isValidSlug } from "@/lib/owid/client";

const CACHE = "public, s-maxage=86400, stale-while-revalidate=604800";

// GET /api/owid/data?slug=life-expectancy&format=csv|metadata&country=USA~GBR&time=1990..2023
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const slug = params.get("slug") ?? "";
  const format = params.get("format") ?? "csv";
  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: "invalid slug" }, { status: 400 });
  }

  try {
    if (format === "metadata") {
      const meta = await fetchChartMetadata(slug);
      return NextResponse.json(meta, { headers: { "Cache-Control": CACHE } });
    }

    const country = params.get("country");
    const time = params.get("time");
    const timeMatch = time?.match(/^(-?\d+)\.\.(-?\d+)$/);
    const csv = await fetchChartCsv(slug, {
      entities: country ? country.split("~").slice(0, 50) : undefined,
      timeRange: timeMatch ? [Number(timeMatch[1]), Number(timeMatch[2])] : undefined,
    });
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": CACHE },
    });
  } catch {
    return NextResponse.json({ error: `could not load OWID chart "${slug}"` }, { status: 502 });
  }
}
