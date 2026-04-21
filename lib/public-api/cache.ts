import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { weatherCache } from "@/lib/db/schema";

type CachePayload = unknown;

export async function readCache<T = CachePayload>(
  key: string,
  ttlMinutes: number,
): Promise<T | null> {
  const rows = await db
    .select({ payload: weatherCache.payload, fetchedAt: weatherCache.fetchedAt })
    .from(weatherCache)
    .where(eq(weatherCache.cacheKey, key))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const ageMin = (Date.now() - row.fetchedAt.getTime()) / 60000;
  if (ageMin > ttlMinutes) return null;
  return row.payload as T;
}

export async function writeCache(
  key: string,
  payload: CachePayload,
  ttlMinutes: number,
): Promise<void> {
  await db
    .insert(weatherCache)
    .values({
      cacheKey: key,
      payload: payload as object,
      fetchedAt: new Date(),
      ttlMinutes,
    })
    .onConflictDoUpdate({
      target: weatherCache.cacheKey,
      set: {
        payload: payload as object,
        fetchedAt: new Date(),
        ttlMinutes,
      },
    });
}

export async function readStale<T = CachePayload>(key: string): Promise<T | null> {
  const rows = await db
    .select({ payload: weatherCache.payload })
    .from(weatherCache)
    .where(eq(weatherCache.cacheKey, key))
    .limit(1);
  return (rows[0]?.payload as T | undefined) ?? null;
}
