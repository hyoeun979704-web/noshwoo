import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type CachePayload = unknown;

export async function readCache<T = CachePayload>(
  key: string,
  ttlMinutes: number,
): Promise<T | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("weather_cache")
    .select("payload, fetched_at")
    .eq("cache_key", key)
    .maybeSingle();

  if (error || !data) return null;

  const ageMin = (Date.now() - new Date(data.fetched_at as string).getTime()) / 60000;
  if (ageMin > ttlMinutes) return null;
  return data.payload as T;
}

export async function writeCache(
  key: string,
  payload: CachePayload,
  ttlMinutes: number,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  await supabase
    .from("weather_cache")
    .upsert({
      cache_key: key,
      payload: payload as object,
      fetched_at: new Date().toISOString(),
      ttl_minutes: ttlMinutes,
    });
}

export async function readStale<T = CachePayload>(key: string): Promise<T | null> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("weather_cache")
    .select("payload")
    .eq("cache_key", key)
    .maybeSingle();
  return (data?.payload as T | undefined) ?? null;
}
