// ขั้นที่ 2 ของ Graph RAG: ค้นหาส่วนของกราฟที่เกี่ยวกับคำถาม (Retrieval)
//
//   1) หา "node ตั้งต้น" (seed) ที่ชื่อตรงกับคำในคำถาม
//   2) เดินออกจาก seed ไปตามเส้นในกราฟ N ก้าว (hops) ได้เป็น subgraph
//   3) แปลง subgraph เป็นข้อความ เพื่อส่งให้ LLM อ่าน
import { getDb } from "@/lib/db";
import { GraphEdge, GraphNode, RELATIONS } from "@/entities/graph";
import { In } from "typeorm";

// ---------- 1) หา node ตั้งต้น ----------
// ใช้การเทียบข้อความแบบง่าย 2 ทาง:
//   - ชื่อ node อยู่ในคำถาม      เช่น คำถามมีคำว่า "กันน้ำ" -> เจอ node "กันน้ำ"
//   - keyword (จาก LLM) อยู่ในชื่อ node  เช่น keyword "หูฟัง" -> เจอ "หูฟังบลูทูธ SoundGo X1"
// ระบบจริงที่กราฟใหญ่มักใช้ vector search (embedding) กับชื่อ node แทนขั้นนี้
export async function findSeedNodes(question: string, keywords: string[] = [], limit = 15) {
  const db = await getDb();
  return db.query<GraphNode[]>(
    `SELECT id, key, type, name, properties
       FROM graph_nodes
      WHERE length(name) >= 2
        AND (
          position(lower(name) in lower($1)) > 0
          OR EXISTS (
            SELECT 1 FROM unnest($2::text[]) AS kw
             WHERE length(kw) >= 2
               AND (lower(name) LIKE '%' || lower(kw) || '%' OR lower(kw) LIKE '%' || lower(name) || '%')
          )
        )
      ORDER BY length(name) DESC
      LIMIT $3`,
    [question, keywords, limit],
  );
}

// ---------- 2) เดินกราฟ ----------
// WITH RECURSIVE ของ PostgreSQL: เริ่มจาก seed แล้วขยายไปยังเพื่อนบ้านทีละชั้น
// เดินได้ทั้งสองทิศ (ไม่สนว่าเส้นชี้จากไหนไปไหน) จนครบจำนวน hops
export async function expandSubgraph(seedIds: number[], hops = 2, maxNodes = 60) {
  const db = await getDb();
  if (seedIds.length === 0) return { nodes: [] as (GraphNode & { depth: number })[], edges: [] as GraphEdge[] };

  const rows = await db.query<{ node_id: number; depth: number }[]>(
    `WITH RECURSIVE walk(node_id, depth) AS (
        SELECT unnest($1::int[]), 0
        UNION
        SELECT CASE WHEN e.source_id = w.node_id THEN e.target_id ELSE e.source_id END,
               w.depth + 1
          FROM walk w
          JOIN graph_edges e ON e.source_id = w.node_id OR e.target_id = w.node_id
         WHERE w.depth < $2
     )
     SELECT node_id, MIN(depth)::int AS depth
       FROM walk
      GROUP BY node_id
      ORDER BY depth, node_id
      LIMIT $3`,
    [seedIds, hops, maxNodes],
  );

  const depthById = new Map(rows.map((r) => [Number(r.node_id), r.depth]));
  const ids = [...depthById.keys()];

  const nodes = (await db.getRepository(GraphNode).findBy({ id: In(ids) }))
    .map((n) => ({ ...n, depth: depthById.get(n.id)! }))
    .sort((a, b) => a.depth - b.depth || a.id - b.id);

  // เอาเฉพาะเส้นที่ทั้งสองปลายอยู่ใน subgraph
  const edges = await db.getRepository(GraphEdge).findBy({ sourceId: In(ids), targetId: In(ids) });

  return { nodes, edges };
}

// ---------- 3) แปลงเป็นข้อความ ----------

const TYPE_TH: Record<string, string> = {
  Product: "สินค้า",
  Category: "หมวดหมู่",
  Customer: "ลูกค้า",
  Province: "จังหวัด",
  Feature: "คุณสมบัติ",
  UseCase: "การใช้งาน",
  Problem: "ปัญหา",
  Brand: "ยี่ห้อ",
};

function describeEdge(e: GraphEdge) {
  const p = e.properties ?? {};
  if (e.relation === "BOUGHT") return ` (รวม ${p.quantity} ชิ้น)`;
  if (e.relation === "REVIEWED") return ` (${p.rating}/5: "${p.comment}")`;
  return "";
}

export function subgraphToText(nodes: GraphNode[], edges: GraphEdge[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const label = (n: GraphNode) => `[${TYPE_TH[n.type] ?? n.type}] ${n.name}`;

  const productLines = nodes
    .filter((n) => n.type === "Product")
    .map((n) => {
      const p = n.properties as { price?: number; stock?: number; description?: string };
      return `- ${n.name}: ราคา ${p.price} บาท, คงเหลือ ${p.stock} ชิ้น. ${p.description ?? ""}`;
    });

  const edgeLines = edges.map((e) => {
    const s = byId.get(e.sourceId)!;
    const t = byId.get(e.targetId)!;
    return `- ${label(s)} --${RELATIONS[e.relation] ?? e.relation}${describeEdge(e)}--> ${label(t)}`;
  });

  return [
    "## รายละเอียดสินค้า",
    productLines.join("\n") || "- (ไม่มี)",
    "",
    "## ความสัมพันธ์ในกราฟ",
    edgeLines.join("\n") || "- (ไม่มี)",
  ].join("\n");
}
