-- NOSYU initial schema (Drizzle-authored; run via `npm run db:push` or paste into Neon console)
CREATE EXTENSION IF NOT EXISTS vector;

-- Enums
DO $$ BEGIN
  CREATE TYPE "experience_source" AS ENUM ('tour_api','partner','seed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "booking_status" AS ENUM ('confirmed','cancelled','completed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "sentiment" AS ENUM ('pos','neu','neg');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Auth.js tables
CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text,
  "email" text UNIQUE,
  "email_verified" timestamp,
  "image" text,
  "persona_tag" text,
  "interests" text[] NOT NULL DEFAULT '{}',
  "visit_date" text,
  "referral_source" text,
  "role" text NOT NULL DEFAULT 'visitor',
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "accounts" (
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "provider" text NOT NULL,
  "provider_account_id" text NOT NULL,
  "refresh_token" text,
  "access_token" text,
  "expires_at" integer,
  "token_type" text,
  "scope" text,
  "id_token" text,
  "session_state" text,
  PRIMARY KEY ("provider", "provider_account_id")
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "session_token" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "expires" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification_tokens" (
  "identifier" text NOT NULL,
  "token" text NOT NULL,
  "expires" timestamp NOT NULL,
  PRIMARY KEY ("identifier", "token")
);

-- NOSYU domain tables
CREATE TABLE IF NOT EXISTS "partners" (
  "id" text PRIMARY KEY NOT NULL,
  "owner_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "business_name" text NOT NULL,
  "region_sigungu" text NOT NULL,
  "approved" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "partners_owner_idx" ON "partners" ("owner_id");

CREATE TABLE IF NOT EXISTS "experiences" (
  "id" text PRIMARY KEY NOT NULL,
  "source" "experience_source" NOT NULL,
  "partner_id" text REFERENCES "partners"("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "category" text NOT NULL,
  "is_indoor" boolean NOT NULL,
  "region_sigungu" text NOT NULL,
  "lat" numeric(9,6),
  "lng" numeric(9,6),
  "price_krw" integer,
  "duration_min" integer,
  "summary" text,
  "images" text[] NOT NULL DEFAULT '{}',
  "external_booking_url" text,
  "embedding" vector(768),
  "popularity" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "experiences_region_indoor_idx"
  ON "experiences" ("region_sigungu", "is_indoor");
CREATE INDEX IF NOT EXISTS "experiences_category_idx"
  ON "experiences" ("category");
-- Build ANN index after first bulk insert:
-- CREATE INDEX experiences_embedding_idx ON experiences
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE IF NOT EXISTS "bookings" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "experience_id" text NOT NULL REFERENCES "experiences"("id") ON DELETE RESTRICT,
  "visit_at" timestamptz NOT NULL,
  "status" "booking_status" NOT NULL DEFAULT 'confirmed',
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "bookings_user_idx" ON "bookings" ("user_id");
CREATE INDEX IF NOT EXISTS "bookings_experience_idx" ON "bookings" ("experience_id");

CREATE TABLE IF NOT EXISTS "reviews" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "experience_id" text NOT NULL REFERENCES "experiences"("id") ON DELETE CASCADE,
  "rating" integer NOT NULL,
  "content" text,
  "sentiment" "sentiment",
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "reviews_rating_chk" CHECK (rating BETWEEN 1 AND 5)
);
CREATE INDEX IF NOT EXISTS "reviews_experience_idx" ON "reviews" ("experience_id");

CREATE TABLE IF NOT EXISTS "weather_cache" (
  "cache_key" text PRIMARY KEY NOT NULL,
  "payload" jsonb NOT NULL,
  "fetched_at" timestamp NOT NULL DEFAULT now(),
  "ttl_minutes" integer NOT NULL DEFAULT 60
);

CREATE TABLE IF NOT EXISTS "recommendations" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "context" jsonb NOT NULL,
  "result" jsonb NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "recommendations_user_idx" ON "recommendations" ("user_id");
