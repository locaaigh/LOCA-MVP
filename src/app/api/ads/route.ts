import { NextRequest, NextResponse } from "next/server";
import { generateGoogleAdsStrategy, generateMetaAdsStrategy } from "@/lib/ai/service";
import type { Business } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { business, platform } = (await req.json()) as {
      business: Business;
      platform: "meta" | "google";
    };
    if (!business || !platform)
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    const result =
      platform === "meta"
        ? await generateMetaAdsStrategy(business)
        : await generateGoogleAdsStrategy(business);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error generando ads" }, { status: 500 });
  }
}
