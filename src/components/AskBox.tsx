"use client"; // มีช่องพิมพ์และปุ่ม จึงต้องทำงานในเบราว์เซอร์

import { useState } from "react";

type AskResult = {
  answer: string;
  steps: {
    "1_keywords": string[];
    "2_seedNodes": string[];
    "3_subgraph": { hops: number; nodeCount: number; edgeCount: number };
    "4_context": string[];
  };
};

const examples = [
  "ลูกค้าในกรุงเทพซื้ออะไรบ้าง",
  "มีสินค้ากันน้ำอะไรบ้างที่ลูกค้าในกรุงเทพซื้อ",
  "ถ้าจะไปแคมป์ปิ้ง ควรซื้ออะไรบ้าง",
];

export default function AskBox() {
  const [question, setQuestion] = useState(examples[0]);
  const [hops, setHops] = useState("2");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/rag/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, hops: Number(hops) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "เกิดข้อผิดพลาด");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          className="w-full border rounded p-3 bg-white"
          rows={2}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          required
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-slate-600">
            เดินกราฟ{" "}
            <select className="border rounded px-2 py-1 bg-white" value={hops} onChange={(e) => setHops(e.target.value)}>
              <option value="1">1 ก้าว</option>
              <option value="2">2 ก้าว</option>
              <option value="3">3 ก้าว</option>
            </select>
          </label>
          <button disabled={loading} className="bg-blue-600 text-white rounded px-4 py-1 disabled:opacity-50">
            {loading ? "กำลังค้นหา..." : "ถาม"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {examples.map((q) => (
            <button key={q} type="button" onClick={() => setQuestion(q)} className="text-sm border rounded-full px-3 py-1 bg-white hover:border-blue-500">
              {q}
            </button>
          ))}
        </div>
      </form>

      {error && <p className="mt-4 text-red-600">{error}</p>}

      {result && (
        <div className="mt-6 space-y-4">
          <section className="bg-white border rounded-lg p-4">
            <h2 className="font-semibold">คำตอบ</h2>
            <p className="mt-2 whitespace-pre-wrap">{result.answer}</p>
          </section>

          <section className="bg-white border rounded-lg p-4 text-sm">
            <h2 className="font-semibold text-base">ระบบทำอะไรไปบ้าง</h2>
            <ol className="mt-2 space-y-1 list-decimal list-inside">
              <li>keyword จากคำถาม: {result.steps["1_keywords"].join(", ") || "(ไม่ได้ใช้ Claude)"}</li>
              <li>node ตั้งต้น: {result.steps["2_seedNodes"].join(", ") || "ไม่พบ"}</li>
              <li>
                เดินกราฟ {result.steps["3_subgraph"].hops} ก้าว ได้ {result.steps["3_subgraph"].nodeCount} node,{" "}
                {result.steps["3_subgraph"].edgeCount} เส้น
              </li>
              <li>แปลงเป็นข้อความส่งให้ Claude (กดดูด้านล่าง)</li>
            </ol>
            <details className="mt-3">
              <summary className="cursor-pointer text-blue-700">ดูข้อความ context ที่ส่งให้ Claude</summary>
              <pre className="mt-2 p-3 bg-slate-50 rounded overflow-x-auto whitespace-pre-wrap">{result.steps["4_context"].join("\n")}</pre>
            </details>
          </section>
        </div>
      )}
    </div>
  );
}
