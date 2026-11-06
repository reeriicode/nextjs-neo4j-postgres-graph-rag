// หน้า http://localhost:3000/about
const stack = [
  { name: "Next.js", text: "ทั้งหน้าเว็บ (page.tsx) และ API (route.ts) อยู่ในโปรเจกต์เดียว" },
  { name: "PostgreSQL + TypeORM", text: "เก็บข้อมูลร้านค้าและตาราง knowledge graph" },
  { name: "Neo4j", text: "สำเนาของกราฟ ไว้ดูเป็นภาพที่ http://localhost:7474" },
  { name: "Claude", text: "ดึงแนวคิดจากคำอธิบาย/รีวิว และเขียนคำตอบ" },
];

export default function AboutPage() {
  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold">เกี่ยวกับร้านของเรา</h1>
      <p className="mt-3 text-slate-600">ร้านขายของออนไลน์ตัวอย่าง สำหรับเรียนรู้การทำ Graph RAG</p>

      <ul className="mt-6 space-y-3">
        {stack.map((s) => (
          <li key={s.name} className="bg-white border rounded-lg p-4">
            <span className="font-semibold">{s.name}</span>
            <span className="text-slate-600"> — {s.text}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
