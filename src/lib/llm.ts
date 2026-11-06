// ตัวช่วยเรียก Claude
// - askJson : บังคับให้ตอบเป็น JSON ตาม schema (structured outputs) ใช้ตอนดึง entity
// - askText : ตอบเป็นข้อความ ใช้ตอนสร้างคำตอบสุดท้าย
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5-5";

// ถ้าไม่มี key ระบบจะข้ามขั้นตอนที่ใช้ LLM (เพื่อให้ลองส่วนอื่นได้ก่อน)
export function hasLLM() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient() {
  return (client ??= new Anthropic());
}

type Effort = "low" | "medium" | "high";

async function call(opts: {
  system: string;
  prompt: string;
  effort: Effort;
  schema?: Record<string, unknown>;
}) {
  const res = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    // ถ้าโมเดลปฏิเสธคำขอ ให้ API ลองโมเดลสำรองที่ Anthropic แนะนำให้อัตโนมัติ
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: opts.effort,
      ...(opts.schema ? { format: { type: "json_schema" as const, schema: opts.schema } } : {}),
    },
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
  });

  if (res.stop_reason === "refusal") {
    throw new Error(`Claude ปฏิเสธคำขอ (${res.stop_details?.category ?? "ไม่ระบุ"})`);
  }
  if (res.stop_reason === "max_tokens") {
    throw new Error("คำตอบยาวเกิน max_tokens");
  }

  return res.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
}

export async function askJson<T>(system: string, prompt: string, schema: Record<string, unknown>): Promise<T> {
  // งานดึงข้อมูลเป็นงานง่าย ใช้ effort ต่ำเพื่อให้เร็วและประหยัด
  const text = await call({ system, prompt, schema, effort: "low" });
  return JSON.parse(text) as T;
}

export async function askText(system: string, prompt: string): Promise<string> {
  return call({ system, prompt, effort: "medium" });
}
