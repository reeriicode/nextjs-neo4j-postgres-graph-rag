import "reflect-metadata";
import { DataSource } from "typeorm";
import { Category, Customer, Order, OrderItem, Product, Review } from "@/entities/shop";
import { GraphEdge, GraphNode } from "@/entities/graph";

const entities = [Category, Product, Customer, Order, OrderItem, Review, GraphNode, GraphEdge];

// เก็บ connection ไว้ใน globalThis เพื่อไม่ให้สร้างใหม่ทุกครั้งที่ Next.js hot reload
const g = globalThis as unknown as { __db?: Promise<DataSource> };

export async function getDb(): Promise<DataSource> {
  if (g.__db) {
    const ds = await g.__db;
    // หลัง hot reload class ของ entity จะเป็นตัวใหม่ ต้องสร้าง DataSource ใหม่ให้ตรงกัน
    if (ds.hasMetadata(Product)) return ds;
    await ds.destroy();
  }

  const ds = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL ?? "postgres://shop:shop@localhost:5434/shop",
    entities,
    // สร้าง/แก้ตารางให้อัตโนมัติจาก entity (สะดวกสำหรับกรณีศึกษา ห้ามใช้บน production)
    synchronize: true,
    logging: false,
  });
  g.__db = ds.initialize();
  return g.__db;
}
