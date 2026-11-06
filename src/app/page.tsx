// หน้าแรก http://localhost:3000
import Link from "next/link";

const cards = [
  { href: "/products", title: "สินค้า", text: "ดูสินค้าทั้งหมด และเพิ่มสินค้าใหม่ผ่านฟอร์ม" },
  { href: "/ask", title: "ถามคำถาม", text: "ถามเป็นภาษาไทย ระบบค้นคำตอบจาก knowledge graph" },
  { href: "/about", title: "เกี่ยวกับเรา", text: "ระบบนี้สร้างด้วยอะไรบ้าง" },
];

export default function HomePage() {
  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold">ร้านค้าของฉัน</h1>
      <p className="mt-3 text-slate-600">ยินดีต้อนรับสู่ร้านค้าตัวอย่าง ข้อมูลทั้งหมดมาจากฐานข้อมูล PostgreSQL</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="block bg-white border rounded-lg p-5 hover:border-blue-500 hover:shadow">
            <h2 className="font-semibold text-lg text-blue-700">{c.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{c.text}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
