import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ForecastSlot } from "@/lib/public-api/weather";

const DEMO_KEY = "__demo_override__";

export type DemoMode = "sunny" | "rainy" | "snowy";

const PRESETS: Record<DemoMode, ForecastSlot[]> = {
  sunny: buildPreset({ tmp: 22, pop: 0, sky: 1, pty: 0 }),
  rainy: buildPreset({ tmp: 16, pop: 80, sky: 4, pty: 1 }),
  snowy: buildPreset({ tmp: -2, pop: 70, sky: 4, pty: 3 }),
};

function buildPreset(base: { tmp: number; pop: number; sky: number; pty: number }): ForecastSlot[] {
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
  const supabase = createSupabaseAdminClient();
  await supabase.from("weather_cache").upsert({
    cache_key: DEMO_KEY,
    payload: { mode, forecast: PRESETS[mode] },
    fetched_at: new Date().toISOString(),
    ttl_minutes: 60 * 24,
  });
}

export async function clearDemoOverride(): Promise<void> {
  const supabase = createSupabaseAdminClient();
  await supabase.from("weather_cache").delete().eq("cache_key", DEMO_KEY);
}

export async function readDemoOverride(): Promise<ForecastSlot[] | null> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null;
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("weather_cache")
    .select("payload")
    .eq("cache_key", DEMO_KEY)
    .maybeSingle();
  const payload = data?.payload as { forecast?: ForecastSlot[] } | null;
  return payload?.forecast ?? null;
}
