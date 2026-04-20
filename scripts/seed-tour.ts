/*
 * One-shot ingestion: Chungnam tour items -> public.experiences.
 * Run with: npm run seed:tour
 * Requires: SUPABASE_SERVICE_ROLE_KEY, DATA_GO_KR_TOUR_KEY (once approved).
 *
 * Plan B (if Tour API approval is delayed):
 *   Load from data/seed-chungnam.csv instead of calling the API.
 */
import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase env vars are missing");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // TODO (Week 2): iterate Chungnam sigungu codes, call Tour API,
  // normalize into experiences rows, then upsert in batches of 100.
  console.log("[seed-tour] stub — implement in Week 2", !!supabase);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
