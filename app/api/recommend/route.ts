import { NextResponse } from "next/server";
import { z } from "zod";
import { recommendCourse } from "@/lib/gemini/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  persona: z.enum(["family", "couple", "solo"]),
  anchorExperienceId: z.string().uuid(),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const plan = await recommendCourse(parsed.data);
    return NextResponse.json({ plan });
  } catch (err) {
    return NextResponse.json(
      { error: "recommend_failed", detail: String(err) },
      { status: 502 },
    );
  }
}
