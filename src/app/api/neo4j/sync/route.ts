// POST /api/neo4j/sync : คัดลอกกราฟจาก PostgreSQL ไปไว้ใน Neo4j
import { handle } from "@/lib/http";
import { syncGraphToNeo4j } from "@/lib/neo4j";

export const POST = handle(async () => syncGraphToNeo4j());
