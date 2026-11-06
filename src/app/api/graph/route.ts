// GET /api/graph                      : สรุปกราฟทั้งหมด (จำนวน node/edge แยกตามชนิด)
// GET /api/graph?name=กันน้ำ&hops=1   : ดูเพื่อนบ้านของ node ที่ชื่อตรงกับคำค้น
import { getDb } from "@/lib/db";
import { handle } from "@/lib/http";
import { expandSubgraph, findSeedNodes, subgraphToText } from "@/lib/graph/retrieve";

export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  const url = new URL(req.url);
  const name = url.searchParams.get("name");
  const hops = Math.min(Math.max(Number(url.searchParams.get("hops") ?? 1), 1), 3);

  if (name) {
    const seeds = await findSeedNodes("", [name]);
    const { nodes, edges } = await expandSubgraph(seeds.map((s) => s.id), hops);
    return {
      seeds: seeds.map((s) => `${s.type}: ${s.name}`),
      hops,
      text: subgraphToText(nodes, edges).split("\n"),
      nodes,
      edges,
    };
  }

  const db = await getDb();
  const [nodesByType, edgesByRelation] = await Promise.all([
    db.query(`SELECT type, count(*)::int AS count FROM graph_nodes GROUP BY type ORDER BY count DESC`),
    db.query(`SELECT relation, count(*)::int AS count FROM graph_edges GROUP BY relation ORDER BY count DESC`),
  ]);
  const concepts = await db.query(
    `SELECT n.type, n.name, count(e.id)::int AS links
       FROM graph_nodes n JOIN graph_edges e ON e.target_id = n.id
      WHERE n.type IN ('Feature','UseCase','Problem','Brand')
      GROUP BY n.id ORDER BY links DESC, n.name LIMIT 30`,
  );
  return { nodesByType, edgesByRelation, topConcepts: concepts };
});
