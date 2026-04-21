import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { weatherCache } from "@/lib/db/schema";
import type { ForecastSlot } from "@/lib/public-api/weather";

const DEMO_KEY = "__demo_override__";

export type DemoMode = "sunny" | "rainy" | "snowy";

const PRESETS: Record<DemoMode, ForecastSlot[]> = {
  sunny: buildPreset({ tmp: 22, pop: 0, sky: 1, pty: 0 }),
  rainy: buildPreset({ tmp: 16, pop: 80, sky: 4, pty: 1 }),
  snowy: buildPreset({ tmp: -2, pop: 70, sky: 4, pty: 3 }),
};

function buildPreset(base: {
  tmp: number;
  pop: number;
  sky: number;
  pty: number;
}): ForecastSlot[] {
  const today = new Date();
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(
    today.getDate(),
  ).padStart(2, "0")}`;
  return Array.from({ length: 12 }, (_, i) => ({
    fcstDate: ymd,
    fcstTime: `${String(8 + i).padStart(2, "0")}00`,
    ...base,
  }));
}

export async function setDemoOverride(mode: DemoMode): Promise<void> {
  const payload = { mode, forecast: PRESETS[mode] };
  await db
    .insert(weatherCache)
    .values({
      cacheKey: DEMO_KEY,
      payload,
      fetchedAt: new Date(),
      ttlMinutes: 60 * 24,
    })
    .onConflictDoUpdate({
      target: weatherCache.cacheKey,
      set: { payload, fetchedAt: new Date(), ttlMinutes: 60 * 24 },
    });
}

export async function clearDemoOverride(): Promise<void> {
  await db.delete(weatherCache).where(eq(weatherCache.cacheKey, DEMO_KEY));
}

export async function readDemoOverride(): Promise<ForecastSlot[] | null> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null;
  const rows = await db
    .select({ payload: weatherCache.payload })
    .from(weatherCache)
    .where(eq(weatherCache.cacheKey, DEMO_KEY))
    .limit(1);
  const payload = rows[0]?.payload as { forecast?: ForecastSlot[] } | undefined;
  return payload?.forecast ?? null;
}
