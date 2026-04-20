// JSON schemas used with Gemini `responseSchema` to force structured outputs.
// Keep in sync with lib/gemini/prompts.ts.

export const coursePlanSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    stops: {
      type: "array",
      items: {
        type: "object",
        properties: {
          experience_id: { type: "string" },
          start_hh: { type: "integer" },
          reason: { type: "string" },
          weather_fit: { type: "string", enum: ["good", "ok", "bad"] },
        },
        required: ["experience_id", "start_hh", "weather_fit"],
      },
    },
    indoor_fallback_ids: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "stops"],
} as const;

export const reviewSentimentSchema = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          sentiment: { type: "string", enum: ["pos", "neu", "neg"] },
          keywords: { type: "array", items: { type: "string" } },
        },
        required: ["id", "sentiment"],
      },
    },
  },
  required: ["results"],
} as const;

export const nlSearchFilterSchema = {
  type: "object",
  properties: {
    is_indoor: { type: "boolean" },
    persona: { type: "string", enum: ["family", "couple", "solo"] },
    region_sigungu: { type: "string" },
    categories: { type: "array", items: { type: "string" } },
  },
} as const;

export type CoursePlan = {
  summary: string;
  stops: Array<{
    experience_id: string;
    start_hh: number;
    reason?: string;
    weather_fit: "good" | "ok" | "bad";
  }>;
  indoor_fallback_ids?: string[];
};
