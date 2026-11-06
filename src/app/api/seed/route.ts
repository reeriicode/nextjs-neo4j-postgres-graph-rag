// POST /api/seed : ล้างฐานข้อมูลแล้วใส่ข้อมูลตัวอย่าง
import { handle } from "@/lib/http";
import { seed } from "@/lib/seed";

export const POST = handle(async () => {
  const counts = await seed();
  return { ok: true, inserted: counts, next: "เรียก POST /api/graph/build เพื่อสร้างกราฟ" };
});
