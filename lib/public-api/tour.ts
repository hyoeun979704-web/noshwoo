import { z } from "zod";

export const TourItem = z.object({
  contentId: z.string(),
  title: z.string(),
  addr: z.string(),
  sigungu: z.string(),
  lat: z.number(),
  lng: z.number(),
  imageUrl: z.string().optional(),
  category: z.string(),
});
export type TourItem = z.infer<typeof TourItem>;

// Batch ingestion only (scripts/seed-tour.ts). Runtime reads from the
// `experiences` table, not this API, to avoid quota/latency issues.
export async function fetchChungnamTourList(
  _sigunguCode: string,
  _page = 1,
): Promise<TourItem[]> {
  throw new Error("Tour API fetch not implemented yet");
}
