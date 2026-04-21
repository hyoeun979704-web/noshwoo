import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  bigserial,
  vector,
  primaryKey,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// =============================================================
// Auth.js tables (managed by @auth/drizzle-adapter)
// Extended with NOSYU visitor profile columns on `users`.
// =============================================================
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),

  // NOSYU profile
  personaTag: text("persona_tag"), // 'family' | 'couple' | 'solo'
  interests: text("interests").array().notNull().default([]),
  visitDate: text("visit_date"),
  referralSource: text("referral_source"),
  role: text("role").notNull().default("visitor"), // 'visitor' | 'partner'

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  }),
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

// =============================================================
// NOSYU domain tables
// =============================================================
export const partners = pgTable(
  "partners",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    businessName: text("business_name").notNull(),
    regionSigungu: text("region_sigungu").notNull(),
    approved: boolean("approved").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ ownerIdx: index("partners_owner_idx").on(t.ownerId) }),
);

export const experienceSource = pgEnum("experience_source", [
  "tour_api",
  "partner",
  "seed",
]);

export const experiences = pgTable(
  "experiences",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    source: experienceSource("source").notNull(),
    partnerId: text("partner_id").references(() => partners.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    category: text("category").notNull(),
    isIndoor: boolean("is_indoor").notNull(),
    regionSigungu: text("region_sigungu").notNull(),
    lat: numeric("lat", { precision: 9, scale: 6 }),
    lng: numeric("lng", { precision: 9, scale: 6 }),
    priceKrw: integer("price_krw"),
    durationMin: integer("duration_min"),
    summary: text("summary"),
    images: text("images").array().notNull().default([]),
    externalBookingUrl: text("external_booking_url"),
    embedding: vector("embedding", { dimensions: 768 }),
    popularity: integer("popularity").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    regionIndoorIdx: index("experiences_region_indoor_idx").on(t.regionSigungu, t.isIndoor),
    categoryIdx: index("experiences_category_idx").on(t.category),
  }),
);

export const bookingStatus = pgEnum("booking_status", [
  "confirmed",
  "cancelled",
  "completed",
]);

export const bookings = pgTable(
  "bookings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    experienceId: text("experience_id")
      .notNull()
      .references(() => experiences.id, { onDelete: "restrict" }),
    visitAt: timestamp("visit_at", { withTimezone: true }).notNull(),
    status: bookingStatus("status").notNull().default("confirmed"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("bookings_user_idx").on(t.userId),
    expIdx: index("bookings_experience_idx").on(t.experienceId),
  }),
);

export const sentiment = pgEnum("sentiment", ["pos", "neu", "neg"]);

export const reviews = pgTable(
  "reviews",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    experienceId: text("experience_id")
      .notNull()
      .references(() => experiences.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    content: text("content"),
    sentiment: sentiment("sentiment"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ expIdx: index("reviews_experience_idx").on(t.experienceId) }),
);

export const weatherCache = pgTable("weather_cache", {
  cacheKey: text("cache_key").primaryKey(),
  payload: jsonb("payload").notNull(),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
  ttlMinutes: integer("ttl_minutes").notNull().default(60),
});

export const recommendations = pgTable(
  "recommendations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    context: jsonb("context").notNull(),
    result: jsonb("result").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ userIdx: index("recommendations_user_idx").on(t.userId) }),
);
