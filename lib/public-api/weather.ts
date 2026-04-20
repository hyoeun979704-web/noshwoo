import { z } from "zod";
import { readCache, writeCache, readStale } from "./cache";

export const ForecastSlot = z.object({
  fcstDate: z.string(),
  fcstTime: z.string(),
  tmp: z.number(),
  pop: z.number(),
  sky: z.number(),
  pty: z.number(),
});
export type ForecastSlot = z.infer<typeof ForecastSlot>;

const TTL_MIN = 60;

export async function getShortForecast(
  nx: number,
  ny: number,
  yyyymmdd: string,
): Promise<ForecastSlot[]> {
  const key = `short:${nx}:${ny}:${yyyymmdd}`;

  const fresh = await readCache<ForecastSlot[]>(key, TTL_MIN);
  if (fresh) return fresh;

  try {
    const upstream = await fetchKmaShort(nx, ny, yyyymmdd);
    const parsed = upstream.map((r) => ForecastSlot.parse(r));
    await writeCache(key, parsed, TTL_MIN);
    return parsed;
  } catch (err) {
    // TODO (Week 2): Open-Meteo fallback + stale degrade
    const stale = await readStale<ForecastSlot[]>(key);
    if (stale) return stale;
    throw err;
  }
}

async function fetchKmaShort(
  _nx: number,
  _ny: number,
  _yyyymmdd: string,
): Promise<ForecastSlot[]> {
  // Implementation wired in Week 2 once DATA_GO_KR_KMA_SHORT_KEY is approved.
  throw new Error("KMA short forecast fetch not implemented yet");
}
