import { NextResponse } from "next/server";
import { z } from "zod";
import { setDemoOverride, clearDemoOverride } from "@/lib/demo/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  token: z.string(),
  mode: z.enum(["sunny", "rainy", "snowy", "clear"]),
});

export async function POST(req: Request) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
    return NextResponse.json({ error: "demo_disabled" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (parsed.data.token !== process.env.DEMO_ADMIN_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (parsed.data.mode === "clear") {
    await clearDemoOverride();
  } else {
    await setDemoOverride(parsed.data.mode);
  }
  return NextResponse.json({ ok: true, mode: parsed.data.mode });
}
