// หน้า http://localhost:3000/ask : ถามคำถามด้วย Graph RAG (เรียก POST /api/rag/ask)
import AskBox from "@/components/AskBox";

export default function AskPage() {
  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold">ถามคำถาม</h1>
      <p className="mt-2 text-slate-600">
        ระบบหา node ที่เกี่ยวกับคำถาม เดินกราฟออกไป แล้วส่งข้อมูลที่เจอให้ Claude ตอบ
      </p>
      <AskBox />
    </main>
  );
}
