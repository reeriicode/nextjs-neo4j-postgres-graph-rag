// ส่งกราฟจาก PostgreSQL ไปเก็บใน Neo4j
//
// PostgreSQL ยังเป็นที่เก็บข้อมูลหลัก ส่วน Neo4j มีไว้เพื่อ
//   - เปิดดูกราฟเป็นภาพใน Neo4j Browser (http://localhost:7474)
//   - ฝึกเขียนคำสั่ง Cypher กับข้อมูลร้านค้าชุดเดียวกัน
import neo4j, { type Driver } from "neo4j-driver";
import { getDb } from "@/lib/db";
import { GraphEdge, GraphNode, RELATIONS } from "@/entities/graph";

let driver: Driver | null = null;

export function getNeo4j() {
  driver ??= neo4j.driver(
    process.env.NEO4J_URI ?? "bolt://localhost:7687",
    neo4j.auth.basic(process.env.NEO4J_USER ?? "neo4j", process.env.NEO4J_PASSWORD ?? "password123"),
  );
  return driver;
}

// ตัวเลขใน JavaScript จะกลายเป็นทศนิยมใน Neo4j (เช่น 25 -> 25.0)
// จึงแปลงจำนวนเต็มเป็น Integer ของ Neo4j ก่อนส่ง
function toNeo4jProps(props: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(props).map(([k, v]) => [k, typeof v === "number" && Number.isInteger(v) ? neo4j.int(v) : v]),
  );
}

// Cypher ใส่ชื่อ label/relationship เป็น parameter ไม่ได้ ต้องเขียนลงในคำสั่งตรงๆ
// จึงเช็กก่อนว่าเป็นชื่อที่ปลอดภัย (ตัวอักษร ตัวเลข _ เท่านั้น)
function safeName(name: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error(`ชื่อไม่ถูกต้อง: ${name}`);
  return name;
}

export async function syncGraphToNeo4j() {
  const db = await getDb();
  const nodes = await db.getRepository(GraphNode).find();
  const edges = await db.getRepository(GraphEdge).find();
  if (nodes.length === 0) throw new Error("ยังไม่มีกราฟ ให้เรียก POST /api/graph/build ก่อน");

  const d = getNeo4j();

  // 1) ลบของเดิมทั้งหมด แล้วสร้าง index ให้ค้นหา node ด้วย id ได้เร็ว
  await d.executeQuery("MATCH (n:Entity) DETACH DELETE n");
  await d.executeQuery("CREATE INDEX entity_id IF NOT EXISTS FOR (n:Entity) ON (n.id)");

  // 2) สร้าง node: ทุกตัวมี label Entity และ label ตามชนิด เช่น (:Entity:Product)
  const nodeTypes = [...new Set(nodes.map((n) => n.type))];
  for (const type of nodeTypes) {
    const rows = nodes
      .filter((n) => n.type === type)
      .map((n) => ({ id: neo4j.int(n.id), key: n.key, name: n.name, props: toNeo4jProps(n.properties ?? {}) }));
    await d.executeQuery(
      `UNWIND $rows AS r
       CREATE (n:Entity:${safeName(type)} {id: r.id, key: r.key, name: r.name})
       SET n += r.props`,
      { rows },
    );
  }

  // 3) สร้างเส้นเชื่อม เช่น (ลูกค้า)-[:BOUGHT]->(สินค้า)
  const relations = [...new Set(edges.map((e) => e.relation))];
  for (const rel of relations) {
    const rows = edges
      .filter((e) => e.relation === rel)
      .map((e) => ({ s: neo4j.int(e.sourceId), t: neo4j.int(e.targetId), props: toNeo4jProps(e.properties ?? {}) }));
    await d.executeQuery(
      `UNWIND $rows AS r
       MATCH (a:Entity {id: r.s}), (b:Entity {id: r.t})
       CREATE (a)-[x:${safeName(rel)}]->(b)
       SET x += r.props, x.label = $label`,
      { rows, label: RELATIONS[rel] ?? rel },
    );
  }

  const { records } = await d.executeQuery(
    "MATCH (n:Entity) WITH count(n) AS nodes OPTIONAL MATCH ()-[r]->() RETURN nodes, count(r) AS edges",
  );
  return {
    nodes: records[0].get("nodes").toNumber(),
    edges: records[0].get("edges").toNumber(),
    browser: "เปิด http://localhost:7474 แล้วลองคำสั่ง MATCH (n)-[r]->(m) RETURN n, r, m",
  };
}
