// GET  /api/customers : รายการลูกค้า
// POST /api/customers : เพิ่มลูกค้า { name, province }
import { getDb } from "@/lib/db";
import { handle, readJson, requireFields } from "@/lib/http";
import { Customer } from "@/entities/shop";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const db = await getDb();
  return db.getRepository(Customer).find({ order: { id: "ASC" } });
});

export const POST = handle(async (req: Request) => {
  const body = await readJson<{ name: string; province: string }>(req);
  requireFields(body, ["name", "province"]);
  const db = await getDb();
  return db.getRepository(Customer).save({ name: body.name, province: body.province });
});
