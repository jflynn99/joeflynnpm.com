import { NextRequest, NextResponse } from "next/server";
import { searchOwid } from "@/lib/owid/client";

const CACHE = "public, s-maxage=86400, stale-while-revalidate=604800";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const type = req.nextUrl.searchParams.get("type") ?? undefined;
  if (!q) {
    return NextResponse.json({ error: "missing q param" }, { status: 400 });
  }
  try {
    const data = await searchOwid(q, type);
    return NextResponse.json(data, { headers: { "Cache-Control": CACHE } });
  } catch (e) {
    return NextResponse.json({ error: "OWID search failed" }, { status: 502 });
  }
}
