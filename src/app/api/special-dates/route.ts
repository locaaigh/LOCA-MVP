import { NextRequest, NextResponse } from "next/server";
import { getSeasonalityOptions, getSpecialDatesOptions } from "@/lib/special-dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ruta pública (sin auth): catálogo de referencia, no datos de usuario.
export async function GET(req: NextRequest) {
  const industry = req.nextUrl.searchParams.get("industry") || "";
  const [seasonality, specialDates] = await Promise.all([
    getSeasonalityOptions(industry),
    getSpecialDatesOptions(industry),
  ]);
  return NextResponse.json({ seasonality, specialDates });
}
