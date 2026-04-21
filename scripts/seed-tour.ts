/*
 * One-shot ingestion: Chungnam tour items -> experiences table.
 * Run with: npm run seed:tour
 * Requires: DATABASE_URL, DATA_GO_KR_TOUR_KEY (once approved).
 *
 * Plan B (if Tour API approval is delayed):
 *   Load from data/seed-chungnam.csv instead of calling the API.
 */
import "dotenv/config";
import { db } from "@/lib/db/client";
import { experiences } from "@/lib/db/schema";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing");
  }
  // TODO (Week 2): iterate Chungnam sigungu codes, call Tour API,
  // normalize into experiences rows, then upsert in batches of 100.
  console.log("[seed-tour] stub — implement in Week 2", !!db, !!experiences);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
