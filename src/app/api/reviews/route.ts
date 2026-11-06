// GET  /api/reviews : รายการรีวิว
// POST /api/reviews : เพิ่มรีวิว { productId, customerId, rating, comment }
import { getDb } from "@/lib/db";
import { HttpError, handle, readJson, requireFields } from "@/lib/http";
import { Review } from "@/entities/shop";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const db = await getDb();
  return db.getRepository(Review).find({
    relations: { product: true, customer: true },
    order: { id: "ASC" },
  });
});

export const POST = handle(async (req: Request) => {
  const body = await readJson<Partial<Review>>(req);
  requireFields(body, ["productId", "customerId", "rating", "comment"]);
  const rating = Number(body.rating);
  if (!(rating >= 1 && rating <= 5)) throw new HttpError(400, "rating ต้องอยู่ระหว่าง 1-5");

  const db = await getDb();
  return db.getRepository(Review).save({
    productId: Number(body.productId),
    customerId: Number(body.customerId),
    rating,
    comment: String(body.comment),
  });
});
