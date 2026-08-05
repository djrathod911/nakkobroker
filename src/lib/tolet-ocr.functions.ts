import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  // data URL: data:image/jpeg;base64,....
  image: z.string().min(32).max(12_000_000),
  mimeType: z.string().min(3).max(60),
});

export interface BoardScanResult {
  title: string | null;
  area: string | null;
  bhk: number | null;
  rent: number | null;
  deposit: number | null;
  furnishing: string | null;
  tenant: string | null;
  contact_phone: string | null;
  available_from: string | null;
  rawText: string | null;
  confidence: "high" | "medium" | "low";
}

const SYSTEM = `You read photographs of Indian "To-Let" / "For Rent" boards and signage, usually from Hyderabad.
Extract the rental details you can actually see. Never invent values — use null when a field is not legible or absent.
Rent and deposit must be plain integers in rupees (expand shorthand: "15k" -> 15000, "1.5 L" -> 150000).
bhk is an integer 1-6 (treat "single room"/"1RK" as 1).
furnishing must be exactly one of "Unfurnished", "Semi Furnished", "Fully Furnished".
tenant must be exactly one of "Family", "Bachelor", "Anyone".
area should be the Hyderabad locality name if visible, else null.
title is a short human listing title you can infer, max 80 chars.
rawText is the transcribed text on the board.
confidence reflects how legible the board is.
Reply with a single JSON object only.`;

export const scanToLetBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<BoardScanResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured");

    const url = data.image.startsWith("data:")
      ? data.image
      : `data:${data.mimeType};base64,${data.image}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the rental details from this To-Let board photo." },
              { type: "image_url", image_url: { url } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("Too many scans right now — try again in a minute.");
    if (res.status === 402) throw new Error("AI credits exhausted — add credits to keep scanning.");
    if (!res.ok) throw new Error(`Could not read the board (${res.status})`);

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? "{}";

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(content) as Record<string, unknown>;
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]) as Record<string, unknown>;
        } catch {
          parsed = {};
        }
      }
    }

    const str = (v: unknown, max = 200) =>
      typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
    const int = (v: unknown) => {
      const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^\d.]/g, ""));
      return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
    };
    const oneOf = (v: unknown, allowed: string[]) => {
      const s = str(v);
      return s && allowed.includes(s) ? s : null;
    };

    const conf = str(parsed["confidence"])?.toLowerCase();

    return {
      title: str(parsed["title"], 80),
      area: str(parsed["area"], 60),
      bhk: (() => {
        const n = int(parsed["bhk"]);
        return n && n >= 1 && n <= 6 ? n : null;
      })(),
      rent: int(parsed["rent"]),
      deposit: int(parsed["deposit"]),
      furnishing: oneOf(parsed["furnishing"], ["Unfurnished", "Semi Furnished", "Fully Furnished"]),
      tenant: oneOf(parsed["tenant"], ["Family", "Bachelor", "Anyone"]),
      contact_phone: str(parsed["contact_phone"], 20),
      available_from: str(parsed["available_from"], 40),
      rawText: str(parsed["rawText"], 1200),
      confidence: conf === "high" || conf === "medium" ? conf : "low",
    };
  });
