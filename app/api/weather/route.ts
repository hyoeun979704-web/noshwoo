import { NextResponse } from "next/server";
import { getShortForecast } from "@/lib/public-api/weather";
import { readDemoOverride } from "@/lib/demo/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const nx = Number(url.searchParams.get("nx") ?? 67);
  const ny = Number(url.searchParams.get("ny") ?? 100);
  const date = url.searchParams.get("date") ?? todayYmd();

  const demo = await readDemoOverride();
  if (demo) return NextResponse.json({ source: "demo", forecast: demo });

  try {
    const forecast = await getShortForecast(nx, ny, date);
    return NextResponse.json({ source: "kma", forecast });
  } catch (err) {
    return NextResponse.json(
      { error: "weather_unavailable", detail: String(err) },
      { status: 503 },
    );
  }
}

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
