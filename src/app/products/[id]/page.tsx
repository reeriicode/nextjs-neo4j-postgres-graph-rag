// หน้า http://localhost:3000/products/1  ([id] คือส่วนที่เปลี่ยนได้ของ URL)
//
// หน้านี้เป็น Server Component: ทำงานบนเซิร์ฟเวอร์ จึงอ่านฐานข้อมูลผ่าน TypeORM ได้ตรงๆ
// ไม่ต้องเรียก API (ต่างจาก ProductList ที่ทำงานในเบราว์เซอร์ ต้องเรียกผ่าน API)
import Link from "next/link";
import { getDb } from "@/lib/db";
import { Product, Review } from "@/entities/shop";

// อ่านข้อมูลใหม่ทุกครั้งที่เปิดหน้า (ไม่สร้างหน้าไว้ล่วงหน้าตอน build)
export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();

  const product = await db.getRepository(Product).findOne({
    where: { id: Number(id) || 0 },
    relations: { category: true },
  });

  if (!product) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <BackLink />
        <p className="mt-4">ไม่พบสินค้า</p>
      </main>
    );
  }

  const reviews = await db.getRepository(Review).find({
    where: { productId: product.id },
    relations: { customer: true },
    order: { id: "ASC" },
  });

  return (
    <main className="max-w-4xl mx-auto p-6">
      <BackLink />

      <div className="mt-4 bg-white border rounded-lg p-5">
        <p className="text-sm text-slate-500">{product.category?.name}</p>
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <p className="mt-2 text-xl text-blue-700">{product.price.toLocaleString()} บาท</p>
        <p className="mt-1 text-sm text-slate-500">เหลือ {product.stock} ชิ้น</p>
        <p className="mt-4">{product.description || "ไม่มีคำอธิบาย"}</p>
      </div>

      <h2 className="mt-8 text-xl font-semibold">รีวิว ({reviews.length})</h2>
      {reviews.length === 0 && <p className="mt-2 text-slate-500">ยังไม่มีรีวิว</p>}
      <ul className="mt-3 space-y-2">
        {reviews.map((r) => (
          <li key={r.id} className="bg-white border rounded-lg p-3">
            <span className="text-amber-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
            <span className="ml-2 font-medium">{r.customer?.name}</span>
            <p className="mt-1 text-slate-700">{r.comment}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}

function BackLink() {
  return (
    <Link href="/products" className="text-blue-600 underline">
      ← กลับไปหน้าสินค้า
    </Link>
  );
}
