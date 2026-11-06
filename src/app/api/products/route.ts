// GET  /api/products : รายการสินค้า (พร้อมหมวดหมู่)
// POST /api/products : เพิ่มสินค้า { name, description, price, stock, categoryId }
import { getDb } from "@/lib/db";
import { HttpError, handle, readJson, requireFields } from "@/lib/http";
import { Category, Product } from "@/entities/shop";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const db = await getDb();
  return db.getRepository(Product).find({ relations: { category: true }, order: { id: "ASC" } });
});

export const POST = handle(async (req: Request) => {
  const body = await readJson<Partial<Product>>(req);
  requireFields(body, ["name", "price", "categoryId"]);
  const db = await getDb();

  const category = await db.getRepository(Category).findOneBy({ id: Number(body.categoryId) });
  if (!category) throw new HttpError(404, `ไม่พบหมวดหมู่ id ${body.categoryId}`);

  return db.getRepository(Product).save({
    name: body.name,
    description: body.description ?? "",
    price: Number(body.price),
    stock: Number(body.stock ?? 0),
    categoryId: category.id,
  });
});
