import { GoogleGenerativeAI } from "@google/generative-ai";
import { COURSE_SYSTEM_PROMPT } from "./prompts";
import { coursePlanSchema, type CoursePlan } from "./schemas";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";

function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenerativeAI(key);
}

type RecommendInput = {
  persona: "family" | "couple" | "solo";
  anchorExperienceId: string;
  visitDate: string;
};

export async function recommendCourse(input: RecommendInput): Promise<CoursePlan> {
  // Week 2~3: fetch anchor + candidates + hourly_weather from Supabase,
  // then feed them into the model. Stubbed here so the route compiles.
  const model = getClient().getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      // @ts-expect-error responseSchema is a newer SDK field; typed loosely here.
      responseSchema: coursePlanSchema,
      temperature: 0.4,
    },
    systemInstruction: COURSE_SYSTEM_PROMPT,
  });

  const payload = {
    persona: input.persona,
    anchor: { id: input.anchorExperienceId },
    candidates: [] as unknown[],
    hourly_weather: [] as unknown[],
    visit_date: input.visitDate,
  };

  const res = await model.generateContent(JSON.stringify(payload));
  const text = res.response.text();
  return JSON.parse(text) as CoursePlan;
}
