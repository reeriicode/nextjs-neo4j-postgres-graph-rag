// GET  /api/orders : รายการคำสั่งซื้อ (พร้อมลูกค้าและสินค้า)
// POST /api/orders : สร้างคำสั่งซื้อ { customerId, items: [{ productId, quantity }] }
import { In } from "typeorm";
import { getDb } from "@/lib/db";
import { HttpError, handle, readJson, requireFields } from "@/lib/http";
import { Customer, Order, OrderItem, Product } from "@/entities/shop";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const db = await getDb();
  return db.getRepository(Order).find({
    relations: { customer: true, items: { product: true } },
    order: { id: "DESC" },
  });
});

type CreateOrderBody = { customerId: number; items: { productId: number; quantity: number }[] };

export const POST = handle(async (req: Request) => {
  const body = await readJson<CreateOrderBody>(req);
  requireFields(body, ["customerId", "items"]);
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new HttpError(400, "items ต้องมีอย่างน้อย 1 รายการ");
  }

  const db = await getDb();

  // ทำใน transaction: ถ้าสต็อกไม่พอ จะไม่มีอะไรถูกบันทึกเลย
  const orderId = await db.transaction(async (m) => {
    const customer = await m.findOneBy(Customer, { id: Number(body.customerId) });
    if (!customer) throw new HttpError(404, `ไม่พบลูกค้า id ${body.customerId}`);

    const ids = body.items.map((i) => Number(i.productId));
    // ล็อกแถวสินค้าไว้ กันสองคำสั่งซื้อตัดสต็อกพร้อมกัน
    const products = await m.find(Product, { where: { id: In(ids) }, lock: { mode: "pessimistic_write" } });

    const items: OrderItem[] = [];
    for (const { productId, quantity } of body.items) {
      const product = products.find((p) => p.id === Number(productId));
      if (!product) throw new HttpError(404, `ไม่พบสินค้า id ${productId}`);
      const qty = Number(quantity);
      if (!Number.isInteger(qty) || qty <= 0) throw new HttpError(400, "quantity ต้องเป็นจำนวนเต็มบวก");
      if (product.stock < qty) throw new HttpError(409, `สินค้า "${product.name}" เหลือ ${product.stock} ชิ้น`);

      product.stock -= qty;
      items.push(m.create(OrderItem, { productId: product.id, quantity: qty, price: product.price }));
    }

    await m.save(products);
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const order = await m.save(m.create(Order, { customerId: customer.id, total, items }));
    return order.id;
  });

  const order = await db.getRepository(Order).findOne({
    where: { id: orderId },
    relations: { customer: true, items: { product: true } },
  });
  return { order, note: "ข้อมูลใหม่ยังไม่อยู่ในกราฟ เรียก POST /api/graph/build เพื่ออัปเดต" };
});
