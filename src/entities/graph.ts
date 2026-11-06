// ตารางของ Knowledge Graph
//
// กราฟ = node (จุด) + edge (เส้นเชื่อม)
// เราเก็บกราฟไว้ใน PostgreSQL ด้วย 2 ตารางนี้ ไม่ต้องใช้ graph database แยก
// แล้วใช้ SQL แบบ WITH RECURSIVE เดินไปตามเส้นในกราฟ (ดู src/lib/graph/retrieve.ts)
import "reflect-metadata";
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  type Relation,
} from "typeorm";

// ประเภทของ node
// - Product / Category / Customer / Province : มาจากข้อมูลในตารางปกติ
// - Feature / UseCase / Problem / Brand      : LLM ดึงออกมาจากข้อความ (คำอธิบายสินค้า + รีวิว)
export type NodeType =
  | "Product"
  | "Category"
  | "Customer"
  | "Province"
  | "Feature"
  | "UseCase"
  | "Problem"
  | "Brand";

@Entity("graph_nodes")
export class GraphNode {
  @PrimaryGeneratedColumn()
  id: number;

  // key ไม่ซ้ำกัน เช่น "product:3", "feature:กันน้ำ"
  // ทำให้ node เรื่องเดียวกันจากหลายแหล่งรวมเป็น node เดียว
  @Column({ type: "varchar", length: 300, unique: true })
  key: string;

  @Index()
  @Column({ type: "varchar", length: 30 })
  type: NodeType;

  @Index()
  @Column({ type: "varchar", length: 300 })
  name: string;

  // ข้อมูลเพิ่มเติม เช่น ราคา สต็อก (จะถูกใส่ลงใน context ที่ส่งให้ LLM)
  @Column({ type: "jsonb", default: {} })
  properties: Record<string, unknown>;
}

// ชนิดของความสัมพันธ์ + คำอ่านภาษาไทย (ใช้ตอนแปลงกราฟเป็นข้อความให้ LLM อ่าน)
export const RELATIONS = {
  IN_CATEGORY: "อยู่ในหมวด",
  LIVES_IN: "อาศัยอยู่ที่",
  BOUGHT: "ซื้อ",
  REVIEWED: "รีวิว",
  HAS_FEATURE: "มีคุณสมบัติ",
  GOOD_FOR: "เหมาะกับ",
  PRAISED_FOR: "ลูกค้าชมเรื่อง",
  COMPLAINED_ABOUT: "ลูกค้าติเรื่อง",
  MADE_BY: "ผลิตโดย",
} as const;

export type RelationType = keyof typeof RELATIONS;

@Entity("graph_edges")
@Unique(["sourceId", "targetId", "relation"])
export class GraphEdge {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: "int", name: "source_id" })
  sourceId: number;

  @ManyToOne(() => GraphNode, { onDelete: "CASCADE" })
  @JoinColumn({ name: "source_id" })
  source?: Relation<GraphNode>;

  @Index()
  @Column({ type: "int", name: "target_id" })
  targetId: number;

  @ManyToOne(() => GraphNode, { onDelete: "CASCADE" })
  @JoinColumn({ name: "target_id" })
  target?: Relation<GraphNode>;

  @Column({ type: "varchar", length: 50 })
  relation: RelationType;

  // เช่น จำนวนที่ซื้อ, คะแนนรีวิว
  @Column({ type: "jsonb", default: {} })
  properties: Record<string, unknown>;
}
