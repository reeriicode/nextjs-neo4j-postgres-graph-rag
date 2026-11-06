// ขั้นที่ 1 ของ Graph RAG: สร้าง Knowledge Graph (Indexing)
//
// กราฟมาจาก 2 แหล่ง
//   A. ข้อมูลที่มีโครงสร้างอยู่แล้ว (ตาราง) -> แปลงเป็น node/edge ตรงๆ ไม่ต้องใช้ LLM
//        ลูกค้า --ซื้อ--> สินค้า --อยู่ในหมวด--> หมวดหมู่
//   B. ข้อความอิสระ (คำอธิบายสินค้า, รีวิว) -> ให้ LLM อ่านแล้วดึง "แนวคิด" ออกมา
//        สินค้า --มีคุณสมบัติ--> "กันน้ำ"     สินค้า --ลูกค้าติเรื่อง--> "แบตหมดเร็ว"
//
// จุดสำคัญ: node แนวคิดใช้ร่วมกันได้ เช่น หูฟังกับลำโพงชี้ไปที่ "กันน้ำ" node เดียวกัน
// ทำให้ตอนค้นหาเดินจากสินค้าหนึ่งไปหาสินค้าอื่นที่คล้ายกันได้
import { getDb } from "@/lib/db";
import { askJson, hasLLM } from "@/lib/llm";
import { Customer, Order, Product, Review } from "@/entities/shop";
import { GraphEdge, GraphNode, type NodeType, type RelationType } from "@/entities/graph";

type DraftNode = { key: string; type: NodeType; name: string; properties: Record<string, unknown> };
type DraftEdge = { from: string; to: string; relation: RelationType; properties: Record<string, unknown> };

// เก็บกราฟไว้ในหน่วยความจำก่อน แล้วค่อยบันทึกลงฐานข้อมูลทีเดียว
class GraphDraft {
  nodes = new Map<string, DraftNode>();
  edges = new Map<string, DraftEdge>();

  addNode(key: string, type: NodeType, name: string, properties: Record<string, unknown> = {}) {
    if (!this.nodes.has(key)) this.nodes.set(key, { key, type, name, properties });
    return key;
  }

  addEdge(from: string, to: string, relation: RelationType, properties: Record<string, unknown> = {}) {
    const id = `${from}|${relation}|${to}`;
    if (!this.edges.has(id)) this.edges.set(id, { from, to, relation, properties });
    return this.edges.get(id)!;
  }
}

// key ของ node แนวคิด: ตัดช่องว่าง + ตัวเล็ก เพื่อให้ "กันน้ำ" กับ " กันน้ำ " เป็น node เดียวกัน
const conceptKey = (type: NodeType, name: string) => `${type.toLowerCase()}:${name.trim().toLowerCase()}`;

// ---------- A. ข้อมูลที่มีโครงสร้าง ----------

function addStructuredData(g: GraphDraft, products: Product[], customers: Customer[], orders: Order[], reviews: Review[]) {
  for (const p of products) {
    const catKey = g.addNode(`category:${p.categoryId}`, "Category", p.category!.name);
    g.addNode(`product:${p.id}`, "Product", p.name, {
      productId: p.id,
      price: p.price,
      stock: p.stock,
      description: p.description,
    });
    g.addEdge(`product:${p.id}`, catKey, "IN_CATEGORY");
  }

  for (const c of customers) {
    g.addNode(`customer:${c.id}`, "Customer", c.name, { customerId: c.id });
    const provKey = g.addNode(conceptKey("Province", c.province), "Province", c.province);
    g.addEdge(`customer:${c.id}`, provKey, "LIVES_IN");
  }

  // รวมการซื้อสินค้าเดียวกันหลายครั้งเป็นเส้นเดียว แล้วเก็บจำนวนรวมไว้ใน properties
  for (const o of orders) {
    for (const item of o.items ?? []) {
      const edge = g.addEdge(`customer:${o.customerId}`, `product:${item.productId}`, "BOUGHT", { quantity: 0, orders: 0 });
      edge.properties.quantity = Number(edge.properties.quantity) + item.quantity;
      edge.properties.orders = Number(edge.properties.orders) + 1;
    }
  }

  for (const r of reviews) {
    g.addEdge(`customer:${r.customerId}`, `product:${r.productId}`, "REVIEWED", {
      rating: r.rating,
      comment: r.comment,
    });
  }
}

// ---------- B. ให้ LLM ดึงแนวคิดจากข้อความ ----------

// ชนิดความสัมพันธ์ที่ LLM เลือกได้ และชนิดของ node ปลายทาง
const EXTRACTABLE: Record<string, NodeType> = {
  HAS_FEATURE: "Feature", // คุณสมบัติจากคำอธิบายสินค้า
  PRAISED_FOR: "Feature", // ลูกค้าชมเรื่องอะไร (ใช้ node ชนิดเดียวกับคุณสมบัติ)
  GOOD_FOR: "UseCase", // เหมาะกับการใช้งานแบบไหน
  COMPLAINED_ABOUT: "Problem", // ลูกค้าติเรื่องอะไร
  MADE_BY: "Brand", // ยี่ห้อ
};

// JSON schema ที่บังคับให้ Claude ตอบ (structured outputs)
const FACTS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["facts"],
  properties: {
    facts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["relation", "target"],
        properties: {
          relation: { type: "string", enum: Object.keys(EXTRACTABLE) },
          target: { type: "string" },
        },
      },
    },
  },
};

const EXTRACT_SYSTEM = `คุณเป็นผู้ช่วยสร้าง knowledge graph ของร้านค้าออนไลน์
อ่านคำอธิบายสินค้าและรีวิว แล้วดึงความสัมพันธ์ระหว่าง "สินค้านี้" กับแนวคิดต่างๆ

ชนิดความสัมพันธ์:
- HAS_FEATURE: คุณสมบัติที่ระบุในคำอธิบาย เช่น กันน้ำ, แบตอึด, น้ำหนักเบา
- PRAISED_FOR: เรื่องที่ลูกค้าชมในรีวิว (ตั้งชื่อเป็นคุณสมบัติ เช่น เบสแน่น, แบตอึด)
- GOOD_FOR: การใช้งานหรือกลุ่มคนที่เหมาะ เช่น วิ่ง, แคมป์ปิ้ง, ครอบครัว
- COMPLAINED_ABOUT: ปัญหาที่ลูกค้าติในรีวิว เช่น แบตหมดเร็ว, ใส่แล้วเจ็บหู
- MADE_BY: ยี่ห้อ

กติกา:
- target ต้องสั้น 1-4 คำ ภาษาไทย (ยกเว้นชื่อยี่ห้อ) ไม่ต้องใส่ชื่อสินค้า
- ถ้ามีชื่อในรายการ "แนวคิดที่มีอยู่แล้ว" ที่ความหมายเดียวกัน ให้ใช้ชื่อนั้นตรงตัว เพื่อให้สินค้าต่างๆ เชื่อมถึงกัน
- ดึงเฉพาะสิ่งที่ข้อความบอกจริง ห้ามเดา`;

async function addExtractedConcepts(g: GraphDraft, products: Product[], reviews: Review[]) {
  const log: { product: string; facts: { relation: string; target: string }[] }[] = [];

  // ทำทีละสินค้า เพื่อส่งรายชื่อแนวคิดที่เจอแล้วไปให้ LLM ใช้ซ้ำ
  for (const p of products) {
    const known = [...g.nodes.values()]
      .filter((n) => ["Feature", "UseCase", "Problem", "Brand"].includes(n.type))
      .map((n) => `${n.type}: ${n.name}`);

    const productReviews = reviews.filter((r) => r.productId === p.id);
    const prompt = [
      `สินค้า: ${p.name}`,
      `คำอธิบาย: ${p.description}`,
      `รีวิว:\n${productReviews.map((r) => `- (${r.rating}/5) ${r.comment}`).join("\n") || "- ไม่มี"}`,
      `แนวคิดที่มีอยู่แล้ว:\n${known.join("\n") || "- ยังไม่มี"}`,
    ].join("\n\n");

    const { facts } = await askJson<{ facts: { relation: string; target: string }[] }>(EXTRACT_SYSTEM, prompt, FACTS_SCHEMA);

    for (const f of facts) {
      const type = EXTRACTABLE[f.relation];
      const name = f.target.trim();
      if (!type || !name) continue;
      const key = g.addNode(conceptKey(type, name), type, name);
      g.addEdge(`product:${p.id}`, key, f.relation as RelationType);
    }
    log.push({ product: p.name, facts });
  }
  return log;
}

// ---------- บันทึกลงฐานข้อมูล ----------

export async function buildGraph(opts: { useLLM?: boolean } = {}) {
  const useLLM = (opts.useLLM ?? true) && hasLLM();
  const db = await getDb();

  const [products, customers, orders, reviews] = await Promise.all([
    db.getRepository(Product).find({ relations: { category: true }, order: { id: "ASC" } }),
    db.getRepository(Customer).find({ order: { id: "ASC" } }),
    db.getRepository(Order).find({ relations: { items: true } }),
    db.getRepository(Review).find({ order: { id: "ASC" } }),
  ]);

  const g = new GraphDraft();
  addStructuredData(g, products, customers, orders, reviews);
  const extraction = useLLM ? await addExtractedConcepts(g, products, reviews) : [];

  // สร้างกราฟใหม่ทั้งหมดทุกครั้ง (ง่ายที่สุดสำหรับกรณีศึกษา)
  await db.transaction(async (m) => {
    await m.query(`TRUNCATE graph_edges, graph_nodes RESTART IDENTITY CASCADE`);

    const saved = await m.save(GraphNode, [...g.nodes.values()]);
    const idByKey = new Map(saved.map((n) => [n.key, n.id]));

    const edges = [...g.edges.values()]
      .filter((e) => idByKey.has(e.from) && idByKey.has(e.to))
      .map((e) => ({
        sourceId: idByKey.get(e.from)!,
        targetId: idByKey.get(e.to)!,
        relation: e.relation,
        properties: e.properties,
      }));
    await m.save(GraphEdge, edges, { chunk: 200 });
  });

  const countBy = <T,>(items: T[], key: (i: T) => string) =>
    items.reduce<Record<string, number>>((acc, i) => ((acc[key(i)] = (acc[key(i)] ?? 0) + 1), acc), {});

  return {
    usedLLM: useLLM,
    warning: useLLM ? undefined : "ไม่ได้ใช้ LLM (ไม่มี ANTHROPIC_API_KEY หรือส่ง useLLM: false) กราฟจึงมีแค่ข้อมูลจากตาราง",
    nodes: g.nodes.size,
    edges: g.edges.size,
    nodesByType: countBy([...g.nodes.values()], (n) => n.type),
    edgesByRelation: countBy([...g.edges.values()], (e) => e.relation),
    extraction,
  };
}
