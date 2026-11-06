// GET  /api/categories : รายการหมวดหมู่
// POST /api/categories : เพิ่มหมวดหมู่ { name }
import { getDb } from "@/lib/db";
import { handle, readJson, requireFields } from "@/lib/http";
import { Category } from "@/entities/shop";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const db = await getDb();
  return db.getRepository(Category).find({ order: { id: "ASC" } });
});

export const POST = handle(async (req: Request) => {
  const body = await readJson<{ name: string }>(req);
  requireFields(body, ["name"]);
  const db = await getDb();
  return db.getRepository(Category).save({ name: body.name });
});
