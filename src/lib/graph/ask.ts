// ขั้นที่ 3 ของ Graph RAG: ตอบคำถาม (Generation)
//
// ลำดับการทำงานทั้งหมดเมื่อมีคำถามเข้ามา:
//   คำถาม -> [LLM] ดึง keyword -> หา node ตั้งต้น -> เดินกราฟ -> แปลงเป็นข้อความ -> [LLM] ตอบ
//
// ฟังก์ชันนี้คืนผลของทุกขั้นตอนออกมาด้วย เพื่อให้เห็นว่าแต่ละขั้นได้อะไร
import { askJson, askText, hasLLM } from "@/lib/llm";
import { expandSubgraph, findSeedNodes, subgraphToText } from "@/lib/graph/retrieve";

const KEYWORD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["keywords"],
  properties: { keywords: { type: "array", items: { type: "string" } } },
};

const KEYWORD_SYSTEM = `ดึงคำสำคัญจากคำถามของลูกค้าร้านค้า เพื่อใช้ค้นหา node ใน knowledge graph
คำสำคัญคือ ชื่อสินค้า ประเภทสินค้า ยี่ห้อ คุณสมบัติ การใช้งาน ปัญหา ชื่อลูกค้า หรือจังหวัด
ตอบเป็นคำสั้นๆ ภาษาไทย 1-3 คำต่อรายการ เช่น "หูฟัง", "กันน้ำ", "วิ่ง", "ยะลา"`;

const ANSWER_SYSTEM = `คุณเป็นผู้ช่วยของร้านค้าออนไลน์
ตอบคำถามโดยใช้เฉพาะข้อมูลจาก knowledge graph ที่ให้มาเท่านั้น
- ถ้าข้อมูลไม่พอ ให้บอกตรงๆ ว่าไม่พบข้อมูล ห้ามแต่งเพิ่ม
- อ้างชื่อสินค้าและราคาให้ชัดเจน
- ถ้าคำตอบมาจากการเชื่อมข้อมูลหลายต่อ ให้อธิบายสั้นๆ ว่าเชื่อมกันอย่างไร
- ตอบเป็นภาษาไทย กระชับ`;

export async function askGraph(question: string, opts: { hops?: number; maxNodes?: number } = {}) {
  const hops = Math.min(Math.max(opts.hops ?? 2, 1), 3);
  const llm = hasLLM();

  // 1) ดึง keyword จากคำถาม (ถ้าไม่มี LLM จะใช้แค่การหาชื่อ node ที่อยู่ในคำถาม)
  const keywords = llm
    ? (await askJson<{ keywords: string[] }>(KEYWORD_SYSTEM, question, KEYWORD_SCHEMA)).keywords
    : [];

  // 2) หา node ตั้งต้น
  const seeds = await findSeedNodes(question, keywords);

  // 3) เดินกราฟออกจาก node ตั้งต้น
  const { nodes, edges } = await expandSubgraph(seeds.map((s) => s.id), hops, opts.maxNodes ?? 60);

  // 4) แปลง subgraph เป็นข้อความ (context)
  const context = subgraphToText(nodes, edges);

  // 5) ให้ LLM ตอบจาก context
  let answer: string;
  if (seeds.length === 0) {
    answer = "ไม่พบข้อมูลในกราฟที่เกี่ยวข้องกับคำถามนี้";
  } else if (!llm) {
    answer = "(ไม่มี ANTHROPIC_API_KEY จึงข้ามขั้นตอนสร้างคำตอบ ดู context ด้านล่างเพื่อดูข้อมูลที่ระบบค้นเจอ)";
  } else {
    answer = await askText(ANSWER_SYSTEM, `ข้อมูลจาก knowledge graph:\n${context}\n\nคำถาม: ${question}`);
  }

  return {
    question,
    answer,
    steps: {
      "1_keywords": keywords,
      "2_seedNodes": seeds.map((s) => `${s.type}: ${s.name}`),
      "3_subgraph": {
        hops,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        nodes: nodes.map((n) => ({ id: n.id, type: n.type, name: n.name, depth: n.depth })),
      },
      "4_context": context.split("\n"),
    },
  };
}
