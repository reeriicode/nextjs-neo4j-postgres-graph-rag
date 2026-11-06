// POST /api/graph/build : สร้าง Knowledge Graph จากข้อมูลร้านค้า
// body (ไม่บังคับ): { "useLLM": false } เพื่อสร้างเฉพาะส่วนที่มาจากตาราง
import { handle } from "@/lib/http";
import { buildGraph } from "@/lib/graph/build";

export const maxDuration = 300;

export const POST = handle(async (req: Request) => {
  const body = (await req.json().catch(() => ({}))) as { useLLM?: boolean };
  return buildGraph({ useLLM: body.useLLM });
});
