# คู่มือที่ 3: โปรเจกต์ Graph RAG ร้านค้าออนไลน์

> **Next.js (API) + PostgreSQL + TypeORM + Neo4j + Claude**
>
> เป้าหมาย: สร้างระบบขายของแบบง่ายที่ถามคำถามเป็นภาษาไทยได้ เช่น "ลูกค้าในกรุงเทพซื้ออะไรบ้าง" โดยระบบค้นข้อมูลจาก **knowledge graph** แล้วให้ Claude ตอบ
>
> ทดสอบกับ Next.js 16.4, TypeORM 1.1, PostgreSQL 16, Neo4j 5.26, Windows 11
>
> ควรทำ [คู่มือที่ 1](01-nextjs-basics.md) และ [คู่มือที่ 2](02-neo4j-basics.md) ก่อน

---

## สารบัญ

0. [ภาพรวมของระบบ](#0-ภาพรวมของระบบ)
1. [สิ่งที่ต้องมี](#1-สิ่งที่ต้องมี)
2. [สร้างโปรเจกต์ Next.js แบบ API อย่างเดียว](#2-สร้างโปรเจกต์-nextjs-แบบ-api-อย่างเดียว)
3. [ติดตั้ง package](#3-ติดตั้ง-package)
4. [ตั้งค่า TypeScript และ Next.js](#4-ตั้งค่า-typescript-และ-nextjs)
5. [เปิดฐานข้อมูลด้วย Docker](#5-เปิดฐานข้อมูลด้วย-docker)
6. [สร้างตาราง (Entity)](#6-สร้างตาราง-entity)
7. [เชื่อมต่อฐานข้อมูล](#7-เชื่อมต่อฐานข้อมูล)
8. [ข้อมูลตัวอย่างและ API ร้านค้า](#8-ข้อมูลตัวอย่างและ-api-ร้านค้า) ✅ จุดทดสอบ 1
9. [Graph RAG ขั้นที่ 1: สร้างกราฟ](#9-graph-rag-ขั้นที่-1-สร้างกราฟ) ✅ จุดทดสอบ 2
10. [Graph RAG ขั้นที่ 2-3: ค้นหาและตอบ](#10-graph-rag-ขั้นที่-2-3-ค้นหาและตอบ) ✅ จุดทดสอบ 3
11. [ส่งกราฟไปดูใน Neo4j](#11-ส่งกราฟไปดูใน-neo4j) ✅ จุดทดสอบ 4
12. [เปิดใช้ Claude](#12-เปิดใช้-claude) ✅ จุดทดสอบ 5
13. [ไฟล์ทดสอบ API ทั้งหมด](#13-ไฟล์ทดสอบ-api-ทั้งหมด)
14. [กิจกรรมทดลองในห้องเรียน](#14-กิจกรรมทดลองในห้องเรียน)
15. [ปัญหาที่พบบ่อย](#15-ปัญหาที่พบบ่อย)
16. [สรุปโครงสร้างไฟล์](#16-สรุปโครงสร้างไฟล์)

---

## 0. ภาพรวมของระบบ

### Graph RAG คืออะไร (ทบทวน)

**RAG** (Retrieval-Augmented Generation) = ค้นข้อมูลที่เกี่ยวข้องก่อน แล้วส่งให้ AI อ่านประกอบการตอบ จะได้ไม่ตอบมั่ว

**Graph RAG** = RAG ที่เก็บข้อมูลเป็น **กราฟ** (node + เส้นเชื่อม) จึงตอบคำถามที่ต้อง **เชื่อมข้อมูลหลายต่อ** ได้ดี

ตัวอย่าง: "มีสินค้ากันน้ำอะไรบ้างที่ลูกค้าในกรุงเทพซื้อ" ต้องเชื่อม 3 ต่อ

```
(กรุงเทพ) ◄─อาศัยอยู่ที่─ (สมชาย) ─ซื้อ─► (หูฟัง SoundGo) ─มีคุณสมบัติ─► (กันน้ำ)
```

### สถาปัตยกรรม

```
                         ┌───────────── Next.js (API อย่างเดียว) ─────────────┐
                         │                                                    │
 ผู้ใช้ ── HTTP ─────────►│  /api/products, /api/orders ...  (ระบบร้านค้าปกติ)   │
 (REST Client / curl)    │  /api/graph/build   ขั้นที่ 1 สร้างกราฟ                │──► Claude API
                         │  /api/rag/ask       ขั้นที่ 2-3 ค้นหา + ตอบ              │    (ดึงแนวคิด / ตอบ)
                         │  /api/neo4j/sync    ส่งกราฟไป Neo4j                    │
                         └──────────┬───────────────────────────────┬─────────┘
                                    │ TypeORM                        │ neo4j-driver
                                    ▼                                ▼
                         ┌────────────────────┐            ┌──────────────────┐
                         │ PostgreSQL          │            │ Neo4j             │
                         │ - ตารางร้านค้า        │  คัดลอก ──► │ - ดูกราฟเป็นภาพ     │
                         │ - graph_nodes/edges │            │ - ฝึก Cypher       │
                         └────────────────────┘            └──────────────────┘
```

- **PostgreSQL** เก็บข้อมูลจริงทั้งหมด รวมถึงกราฟ (ตาราง `graph_nodes`, `graph_edges`)
- **Neo4j** เป็นสำเนาของกราฟ ไว้ดูเป็นภาพและฝึกคำสั่ง Cypher
- **Claude** ใช้ 2 จุด: อ่านคำอธิบาย/รีวิวเพื่อดึงแนวคิด และเขียนคำตอบสุดท้าย

### Graph RAG 3 ขั้นตอน

```
ขั้นที่ 1  สร้างกราฟ (ทำครั้งเดียว หรือเมื่อข้อมูลเปลี่ยน)
          ตารางร้านค้า ─────────────────────► node/edge   เช่น ลูกค้า ─ซื้อ─► สินค้า
          คำอธิบาย/รีวิว ─► Claude ดึงแนวคิด ─► node/edge   เช่น สินค้า ─มีคุณสมบัติ─► "กันน้ำ"

ขั้นที่ 2  ค้นหา (ทุกครั้งที่มีคำถาม)
          คำถาม ─► Claude ดึง keyword ─► หา node ตั้งต้น ─► เดินกราฟ 1-3 ก้าว ─► subgraph

ขั้นที่ 3  ตอบ
          subgraph ─► แปลงเป็นข้อความ ─► Claude อ่านแล้วตอบ
```

> ทำได้ครบทุกขั้นแม้ยังไม่มี Claude API key (ขั้นที่ใช้ Claude จะถูกข้ามไป) จึงเรียนรู้ได้ก่อน แล้วค่อยใส่ key ในข้อ 12

---

## 1. สิ่งที่ต้องมี

| สิ่งที่ต้องมี | หมายเหตุ |
|---|---|
| Node.js 20.9 ขึ้นไป | `node -v` |
| Docker Desktop (เปิดไว้) | `docker version` ต้องเห็นส่วน Server |
| VS Code + ส่วนขยาย **REST Client** | ใช้ทดสอบ API ภาษาไทยได้สะดวกที่สุด |
| Claude API key | ไม่บังคับในช่วงแรก ใช้ในข้อ 12 สมัครที่ https://console.anthropic.com |

> ถ้ายังเปิด Neo4j จากคู่มือที่ 2 อยู่ ให้หยุดก่อน เพราะใช้พอร์ตเดียวกัน

```bash
docker stop neo4j-lab
```

---

## 2. สร้างโปรเจกต์ Next.js แบบ API อย่างเดียว

ตัวเลือก `--api` จะสร้างโปรเจกต์ที่ไม่มีหน้าเว็บ มีแค่ API

```bash
npx create-next-app@latest rag-graph-shop --api --ts --src-dir --import-alias "@/*" --use-npm
```

```bash
cd rag-graph-shop
```

```bash
code .
```

โครงสร้างที่ได้:

```
rag-graph-shop/
├── src/app/
│   ├── route.ts          ← API ที่ /  (ตอบ "Hello world!")
│   └── [slug]/route.ts   ← API ตัวอย่าง (จะลบทิ้ง)
├── next.config.ts
├── package.json
└── tsconfig.json
```

**ลบไฟล์ตัวอย่างที่ไม่ใช้:** ใน VS Code คลิกขวาที่โฟลเดอร์ `src/app/[slug]` → Delete และลบโฟลเดอร์ `.next` (ถ้ามี)

> ถ้าไม่ลบ `.next` อาจเจอ error `Cannot find module '../../src/app/[slug]/route.js'` ตอนตรวจ type ลบแล้วจะหายเอง

ทดสอบว่าโปรเจกต์รันได้:

```bash
npm run dev
```

เปิด http://localhost:3000 ต้องเห็น `{"message":"Hello world!"}` แล้วกด `Ctrl + C` เพื่อหยุด

---

## 3. ติดตั้ง package

```bash
npm install typeorm pg reflect-metadata neo4j-driver @anthropic-ai/sdk
```

```bash
npm install -D @types/pg
```

| Package | ใช้ทำอะไร |
|---|---|
| `typeorm` | ORM: เขียน class แล้วได้ตารางในฐานข้อมูล ไม่ต้องเขียน SQL เอง |
| `pg` | driver เชื่อมต่อ PostgreSQL |
| `reflect-metadata` | ตัวช่วยที่ TypeORM ต้องใช้กับ decorator (`@Entity`, `@Column`) |
| `neo4j-driver` | เชื่อมต่อ Neo4j |
| `@anthropic-ai/sdk` | เรียก Claude API |
| `@types/pg` | type ของ `pg` สำหรับ TypeScript |

---

## 4. ตั้งค่า TypeScript และ Next.js

### 4.1 `tsconfig.json`

แทนที่ทั้งไฟล์ด้วย:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": [
      "dom",
      "dom.iterable",
      "esnext"
    ],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "strictPropertyInitialization": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": [
        "./src/*"
      ]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

บรรทัดที่เพิ่มเพื่อ TypeORM:

| ตั้งค่า | เหตุผล |
|---|---|
| `"experimentalDecorators": true` | ให้ใช้ `@Entity()`, `@Column()` ได้ |
| `"emitDecoratorMetadata": true` | ให้ TypeORM อ่านข้อมูล type ของ property ได้ |
| `"strictPropertyInitialization": false` | ไม่ต้องใส่ค่าเริ่มต้นให้ทุก property ใน entity |

### 4.2 `next.config.ts`

แทนที่ทั้งไฟล์ด้วย:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ไม่ให้ Next.js bundle TypeORM กับ pg (TypeORM มี require แบบ dynamic สำหรับ driver หลายตัว)
  serverExternalPackages: ["typeorm", "pg", "neo4j-driver"],
};

export default nextConfig;
```

> `serverExternalPackages` บอก Next.js ว่าไม่ต้องรวม 3 package นี้เข้าไปในไฟล์ที่ build (TypeORM โหลด driver แบบพิเศษที่ Next.js รวมไม่ได้)

---

## 5. เปิดฐานข้อมูลด้วย Docker

### 5.1 `docker-compose.yml`

สร้างไฟล์ที่โฟลเดอร์นอกสุดของโปรเจกต์:

```yaml
services:
  # ฐานข้อมูลหลัก: ข้อมูลร้านค้า + ตารางกราฟ
  postgres:
    image: postgres:16
    container_name: rag-graph-postgres
    environment:
      POSTGRES_USER: shop
      POSTGRES_PASSWORD: shop
      POSTGRES_DB: shop
    ports:
      - "5434:5432" # เครื่อง:5434 -> container:5432
    volumes:
      - pgdata:/var/lib/postgresql/data

  # Graph database: ไว้ดูกราฟเป็นภาพและฝึกคำสั่ง Cypher
  neo4j:
    image: neo4j:5-community
    container_name: rag-graph-neo4j
    environment:
      NEO4J_AUTH: neo4j/password123
    ports:
      - "7474:7474" # Neo4j Browser (หน้าเว็บ)
      - "7687:7687" # Bolt (โปรแกรมเชื่อมต่อผ่านพอร์ตนี้)
    volumes:
      - neo4jdata:/data

volumes:
  pgdata:
  neo4jdata:
```

> **ทำไมใช้พอร์ต 5434?** เครื่องส่วนใหญ่มี PostgreSQL ตัวอื่นใช้พอร์ต 5432 อยู่แล้ว จึงใช้ 5434 เพื่อไม่ให้ชนกัน (ใน container ยังเป็น 5432 ตามปกติ)

### 5.2 ไฟล์ตั้งค่า `.env.example`

```ini
# คัดลอกไฟล์นี้เป็น .env.local แล้วแก้ค่า

# ฐานข้อมูล PostgreSQL (ตรงกับ docker-compose.yml)
DATABASE_URL=postgres://shop:shop@localhost:5434/shop

# API key ของ Claude (ถ้าไม่ใส่ ระบบยังทำงานได้ แต่จะไม่มีขั้นตอนที่ใช้ LLM)
ANTHROPIC_API_KEY=

# Neo4j (ตรงกับ docker-compose.yml)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123

# เปลี่ยนโมเดลได้ (ค่าเริ่มต้น claude-opus-5-5)
# CLAUDE_MODEL=claude-opus-5-5
```

คัดลอกเป็น `.env.local` (Next.js อ่านไฟล์นี้อัตโนมัติ และไม่ถูกส่งขึ้น git)

PowerShell:

```bash
Copy-Item .env.example .env.local
```

Git Bash / Mac / Linux:

```bash
cp .env.example .env.local
```

### 5.3 เปิดฐานข้อมูล

```bash
docker compose up -d
```

เช็กว่าทั้งสองตัวรันอยู่:

```bash
docker ps
```

ต้องเห็น `rag-graph-postgres` และ `rag-graph-neo4j` สถานะ `Up`

---

## 6. สร้างตาราง (Entity)

ใน TypeORM, **1 class = 1 ตาราง** เราไม่ต้องเขียน `CREATE TABLE` เอง เพราะตั้ง `synchronize: true` ไว้ (ข้อ 7) TypeORM จะสร้างตารางให้ตอนเชื่อมต่อครั้งแรก

### 6.1 ตารางร้านค้า: `src/entities/shop.ts`

```
categories ──< products ──< order_items >── orders >── customers
                  │                                       │
                  └──────────────< reviews >──────────────┘
```

```ts
// ตารางของระบบขายของ (ข้อมูลปกติ ไม่เกี่ยวกับ RAG)
//
// หมายเหตุ TypeORM + Next.js:
// - ระบุ type ของทุก column เอง จะได้ไม่ต้องพึ่ง emitDecoratorMetadata
// - ใช้ Relation<T> ครอบ type ของ relation เพื่อกันปัญหา circular import
import "reflect-metadata";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from "typeorm";

@Entity("categories")
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 100, unique: true })
  name: string;

  @OneToMany(() => Product, (p) => p.category)
  products?: Relation<Product[]>;
}

@Entity("products")
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 200 })
  name: string;

  // ข้อความอิสระ: LLM จะอ่านส่วนนี้เพื่อดึง "คุณสมบัติ" ออกมาเป็น node ในกราฟ
  @Column({ type: "text", default: "" })
  description: string;

  @Column({ type: "numeric", precision: 10, scale: 2, transformer: { to: (v: number) => v, from: (v: string) => Number(v) } })
  price: number;

  @Column({ type: "int", default: 0 })
  stock: number;

  @Column({ type: "int", name: "category_id" })
  categoryId: number;

  @ManyToOne(() => Category, (c) => c.products, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "category_id" })
  category?: Relation<Category>;
}

@Entity("customers")
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 200 })
  name: string;

  @Column({ type: "varchar", length: 100 })
  province: string;
}

@Entity("orders")
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int", name: "customer_id" })
  customerId: number;

  @ManyToOne(() => Customer, { onDelete: "CASCADE" })
  @JoinColumn({ name: "customer_id" })
  customer?: Relation<Customer>;

  @Column({ type: "numeric", precision: 12, scale: 2, default: 0, transformer: { to: (v: number) => v, from: (v: string) => Number(v) } })
  total: number;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt: Date;

  @OneToMany(() => OrderItem, (i) => i.order, { cascade: true })
  items?: Relation<OrderItem[]>;
}

@Entity("order_items")
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int", name: "order_id" })
  orderId: number;

  @ManyToOne(() => Order, (o) => o.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order?: Relation<Order>;

  @Column({ type: "int", name: "product_id" })
  productId: number;

  @ManyToOne(() => Product, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "product_id" })
  product?: Relation<Product>;

  @Column({ type: "int" })
  quantity: number;

  // ราคาต่อชิ้น ณ ตอนซื้อ
  @Column({ type: "numeric", precision: 10, scale: 2, transformer: { to: (v: number) => v, from: (v: string) => Number(v) } })
  price: number;
}

@Entity("reviews")
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int", name: "product_id" })
  productId: number;

  @ManyToOne(() => Product, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product?: Relation<Product>;

  @Column({ type: "int", name: "customer_id" })
  customerId: number;

  @ManyToOne(() => Customer, { onDelete: "CASCADE" })
  @JoinColumn({ name: "customer_id" })
  customer?: Relation<Customer>;

  @Column({ type: "int" })
  rating: number; // 1-5

  // ข้อความรีวิว: LLM จะอ่านเพื่อหาว่าลูกค้า "ชม" หรือ "ติ" เรื่องอะไร
  @Column({ type: "text" })
  comment: string;
}
```

| Decorator | ความหมาย |
|---|---|
| `@Entity("products")` | class นี้คือตาราง `products` |
| `@PrimaryGeneratedColumn()` | id เพิ่มอัตโนมัติ 1, 2, 3, ... |
| `@Column({ type: "varchar" })` | คอลัมน์ธรรมดา |
| `@ManyToOne` + `@JoinColumn` | foreign key (สินค้าหลายชิ้นอยู่ใน 1 หมวด) |
| `@OneToMany` | ฝั่งตรงข้ามของ ManyToOne (1 หมวดมีหลายสินค้า) |
| `transformer` | PostgreSQL ส่งตัวเลขทศนิยมมาเป็นข้อความ จึงแปลงกลับเป็น number |

### 6.2 ตารางกราฟ: `src/entities/graph.ts`

กราฟเก็บใน PostgreSQL ด้วย 2 ตาราง: `graph_nodes` (จุด) และ `graph_edges` (เส้น)

| ชนิด node | มาจาก | ตัวอย่าง |
|---|---|---|
| Product, Category, Customer, Province | ตารางร้านค้า | `หูฟังบลูทูธ SoundGo X1`, `กรุงเทพ` |
| Feature, UseCase, Problem, Brand | Claude อ่านจากข้อความ | `กันน้ำ`, `วิ่ง`, `แบตหมดเร็ว`, `SoundGo` |

```ts
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
```

---

## 7. เชื่อมต่อฐานข้อมูล

### 7.1 `src/lib/db.ts`

```ts
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
```

- `getDb()` เรียกได้จากทุก API ได้ connection เดิมเสมอ (ไม่เปิดใหม่ทุกครั้ง)
- `synchronize: true` สร้าง/แก้ตารางตาม entity อัตโนมัติ **ใช้ตอนเรียนเท่านั้น** งานจริงต้องใช้ migration

### 7.2 ตัวช่วยสำหรับ API: `src/lib/http.ts`

ทุก API จะครอบด้วย `handle()` เพื่อแปลง error เป็น JSON ให้อ่านง่าย

```ts
import { NextResponse } from "next/server";

// ใช้โยน error ที่อยากให้ตอบกลับเป็น 4xx
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ครอบ handler ทุกตัว: แปลง error เป็น JSON ให้อ่านง่าย
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<unknown>) {
  return async (...args: A) => {
    try {
      const data = await fn(...args);
      return NextResponse.json(data);
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "body ต้องเป็น JSON");
  }
}

export function requireFields(body: Record<string, unknown>, fields: string[]) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === "");
  if (missing.length) throw new HttpError(400, `ขาดข้อมูล: ${missing.join(", ")}`);
}
```

---

## 8. ข้อมูลตัวอย่างและ API ร้านค้า

### 8.1 ข้อมูลตัวอย่าง: `src/lib/seed.ts`

สินค้า 8 ชิ้น, ลูกค้า 5 คน, คำสั่งซื้อ 8 รายการ, รีวิว 10 รายการ
**สังเกต:** คำอธิบายสินค้าตั้งใจให้มีคำซ้ำกันหลายสินค้า เช่น "กันน้ำ", "แคมป์ปิ้ง", "วิ่ง" เพื่อให้กราฟเชื่อมสินค้าเข้าหากัน

```ts
import { getDb } from "@/lib/db";
import { Category, Customer, Order, OrderItem, Product, Review } from "@/entities/shop";

// ข้อมูลตัวอย่าง: ตั้งใจเขียนคำอธิบายและรีวิวให้มี "คุณสมบัติ" ที่ใช้ร่วมกันหลายสินค้า
// (เช่น กันน้ำ, แบตอึด) เพื่อให้เห็นว่ากราฟเชื่อมสินค้าเข้าหากันผ่านคุณสมบัติได้
const categories = ["อิเล็กทรอนิกส์", "เครื่องใช้ในบ้าน", "กีฬาและเอาท์ดอร์"];

const products = [
  { name: "หูฟังบลูทูธ SoundGo X1", cat: 0, price: 1290, stock: 25,
    description: "หูฟังไร้สายยี่ห้อ SoundGo กันน้ำมาตรฐาน IPX7 เบสแน่น แบตใช้ได้ 30 ชั่วโมง เหมาะกับการออกกำลังกายและวิ่ง" },
  { name: "ลำโพงพกพา SoundGo Mini", cat: 0, price: 990, stock: 40,
    description: "ลำโพงบลูทูธขนาดเล็กยี่ห้อ SoundGo กันน้ำ IPX6 เสียงดังชัด แบต 12 ชั่วโมง เหมาะกับการเดินป่าและแคมป์ปิ้ง" },
  { name: "สมาร์ทวอทช์ FitPulse 3", cat: 0, price: 2490, stock: 15,
    description: "นาฬิกาอัจฉริยะยี่ห้อ FitPulse วัดชีพจรและการนอน มี GPS กันน้ำ 5ATM แบต 7 วัน เหมาะกับนักวิ่งและคนรักสุขภาพ" },
  { name: "หม้อทอดไร้น้ำมัน CookEasy 5L", cat: 1, price: 1890, stock: 20,
    description: "หม้อทอดไร้น้ำมันยี่ห้อ CookEasy ความจุ 5 ลิตร ตั้งเวลาได้ ทำความสะอาดง่าย เหมาะกับครอบครัวและคนรักสุขภาพ" },
  { name: "พัดลมพกพาไร้สาย CoolBreeze", cat: 1, price: 450, stock: 60,
    description: "พัดลมชาร์จไฟ USB พกพาสะดวก ปรับแรงลมได้ 3 ระดับ แบต 8 ชั่วโมง เหมาะกับการเดินทางและแคมป์ปิ้ง" },
  { name: "เต็นท์ 2 คน TrailHome", cat: 2, price: 2190, stock: 10,
    description: "เต็นท์สำหรับ 2 คนยี่ห้อ TrailHome กันฝน กางง่ายใน 5 นาที น้ำหนักเบา เหมาะกับแคมป์ปิ้งและเดินป่า" },
  { name: "กระติกน้ำเก็บอุณหภูมิ HydroKeep 1L", cat: 2, price: 590, stock: 50,
    description: "กระติกสแตนเลสเก็บความเย็นได้ 24 ชั่วโมง ไม่รั่วซึม น้ำหนักเบา เหมาะกับการวิ่ง เดินป่า และใช้ในออฟฟิศ" },
  { name: "รองเท้าวิ่ง SpeedRun Pro", cat: 2, price: 2990, stock: 18,
    description: "รองเท้าวิ่งพื้นนุ่มรองรับแรงกระแทก ระบายอากาศดี น้ำหนักเบา เหมาะกับการวิ่งมาราธอน" },
];

const customers = [
  { name: "สมชาย ใจดี", province: "กรุงเทพ" },
  { name: "อามีนะห์ สาและ", province: "ปัตตานี" },
  { name: "วิภา รักษ์ดี", province: "สงขลา" },
  { name: "ฟาริด หะยีมะ", province: "กรุงเทพ" },
  { name: "นภัส ทองคำ", province: "กรุงเทพ" },
];

// [ลูกค้า index, [[สินค้า index, จำนวน], ...]]
const orders: [number, [number, number][]][] = [
  [0, [[0, 1], [6, 2]]],
  [0, [[7, 1]]],
  [1, [[3, 1], [4, 2]]],
  [2, [[5, 1], [1, 1], [4, 1]]],
  [3, [[0, 1], [2, 1]]],
  [3, [[6, 1]]],
  [4, [[2, 1], [7, 1]]],
  [1, [[1, 1]]],
];

// [ลูกค้า index, สินค้า index, คะแนน, ความเห็น]
const reviews: [number, number, number, string][] = [
  [0, 0, 5, "ใส่วิ่งตอนฝนตกก็ไม่เป็นไร เบสแน่นมาก ชอบ"],
  [3, 0, 3, "เสียงดี แต่ใส่นานแล้วเจ็บหู"],
  [2, 1, 4, "เอาไปแคมป์เสียงดังพอ แต่แบตหมดเร็วกว่าที่โฆษณา"],
  [1, 1, 5, "เล็ก พกง่าย เสียงดีเกินราคา"],
  [3, 2, 5, "วัดชีพจรแม่นยำ แบตอึดจริง ใช้ได้เกือบสัปดาห์"],
  [4, 2, 2, "GPS จับสัญญาณช้า ตอนเริ่มวิ่งต้องรอนาน"],
  [1, 3, 5, "ทอดไก่กรอบโดยไม่ใช้น้ำมัน ล้างง่ายมาก"],
  [2, 5, 4, "กางง่ายจริง แต่ข้างในค่อนข้างร้อน"],
  [0, 6, 5, "น้ำแข็งอยู่ได้ทั้งวัน ไม่รั่วเลย"],
  [4, 7, 4, "นุ่มสบายเท้า วิ่งไกลไม่เจ็บ แต่ไซซ์เล็กกว่าปกติ"],
];

export async function seed() {
  const db = await getDb();

  await db.transaction(async (m) => {
    // ล้างข้อมูลเดิมทั้งหมด (รวมกราฟ) แล้วเริ่มนับ id ใหม่
    await m.query(
      `TRUNCATE graph_edges, graph_nodes, reviews, order_items, orders, customers, products, categories RESTART IDENTITY CASCADE`,
    );

    const cats = await m.save(categories.map((name) => m.create(Category, { name })));
    const prods = await m.save(
      products.map((p) =>
        m.create(Product, { name: p.name, description: p.description, price: p.price, stock: p.stock, categoryId: cats[p.cat].id }),
      ),
    );
    const custs = await m.save(customers.map((c) => m.create(Customer, c)));

    for (const [ci, items] of orders) {
      const orderItems = items.map(([pi, quantity]) =>
        m.create(OrderItem, { productId: prods[pi].id, quantity, price: prods[pi].price }),
      );
      const total = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      await m.save(m.create(Order, { customerId: custs[ci].id, total, items: orderItems }));
    }

    await m.save(
      reviews.map(([ci, pi, rating, comment]) =>
        m.create(Review, { customerId: custs[ci].id, productId: prods[pi].id, rating, comment }),
      ),
    );
  });

  return {
    categories: categories.length,
    products: products.length,
    customers: customers.length,
    orders: orders.length,
    reviews: reviews.length,
  };
}
```

### 8.2 API: `src/app/api/seed/route.ts`

```ts
// POST /api/seed : ล้างฐานข้อมูลแล้วใส่ข้อมูลตัวอย่าง
import { handle } from "@/lib/http";
import { seed } from "@/lib/seed";

export const POST = handle(async () => {
  const counts = await seed();
  return { ok: true, inserted: counts, next: "เรียก POST /api/graph/build เพื่อสร้างกราฟ" };
});
```

### 8.3 API: `src/app/api/categories/route.ts`

```ts
// GET  /api/categories : รายการหมวดหมู่
// POST /api/categories : เพิ่มหมวดหมู่ { name }
import { getDb } from "@/lib/db";
import { handle, readJson, requireFields } from "@/lib/http";
import { Category } from "@/entities/shop";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const db = await getDb();
  return db.getRepository(Category).find({ order: { id: "ASC" } });
});

export const POST = handle(async (req: Request) => {
  const body = await readJson<{ name: string }>(req);
  requireFields(body, ["name"]);
  const db = await getDb();
  return db.getRepository(Category).save({ name: body.name });
});
```

### 8.4 API: `src/app/api/products/route.ts`

```ts
// GET  /api/products : รายการสินค้า (พร้อมหมวดหมู่)
// POST /api/products : เพิ่มสินค้า { name, description, price, stock, categoryId }
import { getDb } from "@/lib/db";
import { HttpError, handle, readJson, requireFields } from "@/lib/http";
import { Category, Product } from "@/entities/shop";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const db = await getDb();
  return db.getRepository(Product).find({ relations: { category: true }, order: { id: "ASC" } });
});

export const POST = handle(async (req: Request) => {
  const body = await readJson<Partial<Product>>(req);
  requireFields(body, ["name", "price", "categoryId"]);
  const db = await getDb();

  const category = await db.getRepository(Category).findOneBy({ id: Number(body.categoryId) });
  if (!category) throw new HttpError(404, `ไม่พบหมวดหมู่ id ${body.categoryId}`);

  return db.getRepository(Product).save({
    name: body.name,
    description: body.description ?? "",
    price: Number(body.price),
    stock: Number(body.stock ?? 0),
    categoryId: category.id,
  });
});
```

### 8.5 API: `src/app/api/customers/route.ts`

```ts
// GET  /api/customers : รายการลูกค้า
// POST /api/customers : เพิ่มลูกค้า { name, province }
import { getDb } from "@/lib/db";
import { handle, readJson, requireFields } from "@/lib/http";
import { Customer } from "@/entities/shop";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const db = await getDb();
  return db.getRepository(Customer).find({ order: { id: "ASC" } });
});

export const POST = handle(async (req: Request) => {
  const body = await readJson<{ name: string; province: string }>(req);
  requireFields(body, ["name", "province"]);
  const db = await getDb();
  return db.getRepository(Customer).save({ name: body.name, province: body.province });
});
```

### 8.6 API: `src/app/api/orders/route.ts`

สร้างคำสั่งซื้อใน **transaction**: ตรวจสต็อก → ตัดสต็อก → บันทึก ถ้าขั้นใดผิดพลาด จะไม่มีอะไรถูกบันทึกเลย

```ts
// GET  /api/orders : รายการคำสั่งซื้อ (พร้อมลูกค้าและสินค้า)
// POST /api/orders : สร้างคำสั่งซื้อ { customerId, items: [{ productId, quantity }] }
import { In } from "typeorm";
import { getDb } from "@/lib/db";
import { HttpError, handle, readJson, requireFields } from "@/lib/http";
import { Customer, Order, OrderItem, Product } from "@/entities/shop";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const db = await getDb();
  return db.getRepository(Order).find({
    relations: { customer: true, items: { product: true } },
    order: { id: "DESC" },
  });
});

type CreateOrderBody = { customerId: number; items: { productId: number; quantity: number }[] };

export const POST = handle(async (req: Request) => {
  const body = await readJson<CreateOrderBody>(req);
  requireFields(body, ["customerId", "items"]);
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new HttpError(400, "items ต้องมีอย่างน้อย 1 รายการ");
  }

  const db = await getDb();

  // ทำใน transaction: ถ้าสต็อกไม่พอ จะไม่มีอะไรถูกบันทึกเลย
  const orderId = await db.transaction(async (m) => {
    const customer = await m.findOneBy(Customer, { id: Number(body.customerId) });
    if (!customer) throw new HttpError(404, `ไม่พบลูกค้า id ${body.customerId}`);

    const ids = body.items.map((i) => Number(i.productId));
    // ล็อกแถวสินค้าไว้ กันสองคำสั่งซื้อตัดสต็อกพร้อมกัน
    const products = await m.find(Product, { where: { id: In(ids) }, lock: { mode: "pessimistic_write" } });

    const items: OrderItem[] = [];
    for (const { productId, quantity } of body.items) {
      const product = products.find((p) => p.id === Number(productId));
      if (!product) throw new HttpError(404, `ไม่พบสินค้า id ${productId}`);
      const qty = Number(quantity);
      if (!Number.isInteger(qty) || qty <= 0) throw new HttpError(400, "quantity ต้องเป็นจำนวนเต็มบวก");
      if (product.stock < qty) throw new HttpError(409, `สินค้า "${product.name}" เหลือ ${product.stock} ชิ้น`);

      product.stock -= qty;
      items.push(m.create(OrderItem, { productId: product.id, quantity: qty, price: product.price }));
    }

    await m.save(products);
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const order = await m.save(m.create(Order, { customerId: customer.id, total, items }));
    return order.id;
  });

  const order = await db.getRepository(Order).findOne({
    where: { id: orderId },
    relations: { customer: true, items: { product: true } },
  });
  return { order, note: "ข้อมูลใหม่ยังไม่อยู่ในกราฟ เรียก POST /api/graph/build เพื่ออัปเดต" };
});
```

### 8.7 API: `src/app/api/reviews/route.ts`

```ts
// GET  /api/reviews : รายการรีวิว
// POST /api/reviews : เพิ่มรีวิว { productId, customerId, rating, comment }
import { getDb } from "@/lib/db";
import { HttpError, handle, readJson, requireFields } from "@/lib/http";
import { Review } from "@/entities/shop";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const db = await getDb();
  return db.getRepository(Review).find({
    relations: { product: true, customer: true },
    order: { id: "ASC" },
  });
});

export const POST = handle(async (req: Request) => {
  const body = await readJson<Partial<Review>>(req);
  requireFields(body, ["productId", "customerId", "rating", "comment"]);
  const rating = Number(body.rating);
  if (!(rating >= 1 && rating <= 5)) throw new HttpError(400, "rating ต้องอยู่ระหว่าง 1-5");

  const db = await getDb();
  return db.getRepository(Review).save({
    productId: Number(body.productId),
    customerId: Number(body.customerId),
    rating,
    comment: String(body.comment),
  });
});
```

### ✅ จุดทดสอบ 1: ระบบร้านค้า

รันเซิร์ฟเวอร์ (เปิดทิ้งไว้ตลอด ใช้ Terminal อีกหน้าต่างสำหรับคำสั่งอื่น):

```bash
npm run dev
```

ใส่ข้อมูลตัวอย่าง:

```bash
curl.exe -X POST http://localhost:3000/api/seed
```

ผลที่ควรได้:

```json
{"ok":true,"inserted":{"categories":3,"products":8,"customers":5,"orders":8,"reviews":10},"next":"เรียก POST /api/graph/build เพื่อสร้างกราฟ"}
```

ดูสินค้า (เปิดในเบราว์เซอร์ได้เลย): http://localhost:3000/api/products

สร้างคำสั่งซื้อ (ลูกค้า id 2 ซื้อสินค้า id 3 จำนวน 1 ชิ้น) ใน REST Client:

```http
POST http://localhost:3000/api/orders
Content-Type: application/json

{ "customerId": 2, "items": [{ "productId": 3, "quantity": 1 }] }
```

ลองสั่ง 999 ชิ้น จะได้ error 409:

```json
{"error":"สินค้า \"สมาร์ทวอทช์ FitPulse 3\" เหลือ 14 ชิ้น"}
```

> **ใช้ curl ส่ง JSON:** เขียน body ไว้ในไฟล์ (เช่น `order.json`) แล้วใช้
> `curl.exe -X POST http://localhost:3000/api/orders -H "Content-Type: application/json" --data-binary "@order.json"`
> (ถ้าพิมพ์ JSON ภาษาไทยในบรรทัดคำสั่งตรงๆ บน Windows ภาษาไทยจะกลายเป็น `??????`)

---

## 9. Graph RAG ขั้นที่ 1: สร้างกราฟ

### 9.1 ตัวช่วยเรียก Claude: `src/lib/llm.ts`

- `askJson()` บังคับให้ Claude ตอบเป็น JSON ตาม schema (structured outputs) ใช้ตอนดึงแนวคิด
- `askText()` ให้ตอบเป็นข้อความ ใช้ตอนเขียนคำตอบสุดท้าย
- `hasLLM()` เช็กว่ามี API key หรือยัง ถ้าไม่มี ระบบจะข้ามขั้นที่ใช้ Claude

```ts
// ตัวช่วยเรียก Claude
// - askJson : บังคับให้ตอบเป็น JSON ตาม schema (structured outputs) ใช้ตอนดึง entity
// - askText : ตอบเป็นข้อความ ใช้ตอนสร้างคำตอบสุดท้าย
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5-5";

// ถ้าไม่มี key ระบบจะข้ามขั้นตอนที่ใช้ LLM (เพื่อให้ลองส่วนอื่นได้ก่อน)
export function hasLLM() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient() {
  return (client ??= new Anthropic());
}

type Effort = "low" | "medium" | "high";

async function call(opts: {
  system: string;
  prompt: string;
  effort: Effort;
  schema?: Record<string, unknown>;
}) {
  const res = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    // ถ้าโมเดลปฏิเสธคำขอ ให้ API ลองโมเดลสำรองที่ Anthropic แนะนำให้อัตโนมัติ
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: opts.effort,
      ...(opts.schema ? { format: { type: "json_schema" as const, schema: opts.schema } } : {}),
    },
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
  });

  if (res.stop_reason === "refusal") {
    throw new Error(`Claude ปฏิเสธคำขอ (${res.stop_details?.category ?? "ไม่ระบุ"})`);
  }
  if (res.stop_reason === "max_tokens") {
    throw new Error("คำตอบยาวเกิน max_tokens");
  }

  return res.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
}

export async function askJson<T>(system: string, prompt: string, schema: Record<string, unknown>): Promise<T> {
  // งานดึงข้อมูลเป็นงานง่าย ใช้ effort ต่ำเพื่อให้เร็วและประหยัด
  const text = await call({ system, prompt, schema, effort: "low" });
  return JSON.parse(text) as T;
}

export async function askText(system: string, prompt: string): Promise<string> {
  return call({ system, prompt, effort: "medium" });
}
```

### 9.2 สร้างกราฟ: `src/lib/graph/build.ts`

ไฟล์นี้คือ **หัวใจของขั้นที่ 1** อ่านตามลำดับ:

1. `GraphDraft` สร้างกราฟในหน่วยความจำก่อน (`addNode`, `addEdge` กันซ้ำด้วย key)
2. `addStructuredData` แปลงตารางเป็นกราฟตรงๆ: สินค้า→หมวด, ลูกค้า→จังหวัด, ลูกค้า→ซื้อ→สินค้า, ลูกค้า→รีวิว→สินค้า
3. `addExtractedConcepts` ส่งคำอธิบาย+รีวิวของสินค้าทีละชิ้นให้ Claude ดึงแนวคิด **พร้อมส่งรายชื่อแนวคิดที่เจอแล้วไปด้วย** เพื่อให้ Claude ใช้ชื่อเดิม เช่น "กันน้ำ" จะได้เป็น node เดียวกันทุกสินค้า
4. `buildGraph` ลบกราฟเก่า แล้วบันทึกกราฟใหม่ลงฐานข้อมูล

```ts
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
```

### 9.3 API: `src/app/api/graph/build/route.ts`

```ts
// POST /api/graph/build : สร้าง Knowledge Graph จากข้อมูลร้านค้า
// body (ไม่บังคับ): { "useLLM": false } เพื่อสร้างเฉพาะส่วนที่มาจากตาราง
import { handle } from "@/lib/http";
import { buildGraph } from "@/lib/graph/build";

export const maxDuration = 300;

export const POST = handle(async (req: Request) => {
  const body = (await req.json().catch(() => ({}))) as { useLLM?: boolean };
  return buildGraph({ useLLM: body.useLLM });
});
```

### ✅ จุดทดสอบ 2: สร้างกราฟ

```bash
curl.exe -X POST http://localhost:3000/api/graph/build
```

ผลที่ควรได้ (ยังไม่มี API key จึงมีแค่กราฟจากตาราง):

```json
{
  "usedLLM": false,
  "warning": "ไม่ได้ใช้ LLM (ไม่มี ANTHROPIC_API_KEY หรือส่ง useLLM: false) กราฟจึงมีแค่ข้อมูลจากตาราง",
  "nodes": 19,
  "edges": 37,
  "nodesByType": { "Category": 3, "Product": 8, "Customer": 5, "Province": 3 },
  "edgesByRelation": { "IN_CATEGORY": 8, "LIVES_IN": 5, "BOUGHT": 14, "REVIEWED": 10 },
  "extraction": []
}
```

> ถ้าทำจุดทดสอบ 1 ครบ (สร้าง order เพิ่ม) จำนวน `BOUGHT` อาจไม่ใช่ 14

ดูข้อมูลในตาราง PostgreSQL ได้ด้วย:

```bash
docker exec -it rag-graph-postgres psql -U shop -d shop -c "SELECT type, name FROM graph_nodes ORDER BY id LIMIT 10;"
```

---

## 10. Graph RAG ขั้นที่ 2-3: ค้นหาและตอบ

### 10.1 ค้นหาในกราฟ: `src/lib/graph/retrieve.ts`

| ฟังก์ชัน | ทำอะไร |
|---|---|
| `findSeedNodes` | หา **node ตั้งต้น** ที่ชื่อตรงกับคำในคำถาม |
| `expandSubgraph` | **เดินกราฟ** ออกจาก node ตั้งต้น N ก้าว ด้วย SQL `WITH RECURSIVE` |
| `subgraphToText` | แปลง subgraph เป็น **ข้อความ** ให้ Claude อ่าน |

**`WITH RECURSIVE` ทำงานอย่างไร** (เริ่มจาก "กรุงเทพ", hops = 2)

```
รอบที่ 0: กรุงเทพ
รอบที่ 1: ใครเชื่อมกับกรุงเทพ?           → สมชาย, ฟาริด, นภัส
รอบที่ 2: ใครเชื่อมกับสมชาย/ฟาริด?     → หูฟัง, กระติกน้ำ, รองเท้าวิ่ง, สมาร์ทวอทช์
ครบ 2 ก้าว หยุด
```

เทียบกับ Cypher ใน Neo4j จะเขียนได้สั้นกว่ามาก: `MATCH (s {name: "กรุงเทพ"})-[*1..2]-(m) RETURN m`

```ts
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
```

### 10.2 รวมทุกขั้นตอน: `src/lib/graph/ask.ts`

```ts
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
ตอบเป็นคำสั้นๆ ภาษาไทย 1-3 คำต่อรายการ เช่น "หูฟัง", "กันน้ำ", "วิ่ง", "กรุงเทพ"`;

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
```

### 10.3 API: `src/app/api/rag/ask/route.ts`

```ts
// POST /api/rag/ask : ถามคำถามด้วย Graph RAG
// body: { "question": "...", "hops": 2 }
import { handle, readJson, requireFields } from "@/lib/http";
import { askGraph } from "@/lib/graph/ask";

export const maxDuration = 120;

export const POST = handle(async (req: Request) => {
  const body = await readJson<{ question: string; hops?: number }>(req);
  requireFields(body, ["question"]);
  return askGraph(String(body.question), { hops: body.hops });
});
```

### 10.4 API ดูกราฟ: `src/app/api/graph/route.ts`

```ts
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
```

### ✅ จุดทดสอบ 3: ถามคำถาม

ใน REST Client:

```http
POST http://localhost:3000/api/rag/ask
Content-Type: application/json

{ "question": "ลูกค้าในกรุงเทพซื้ออะไรบ้าง", "hops": 2 }
```

ผลที่ได้ (ตัดมาบางส่วน) จะเห็นทุกขั้นตอน:

```json
{
  "question": "ลูกค้าในกรุงเทพซื้ออะไรบ้าง",
  "answer": "(ไม่มี ANTHROPIC_API_KEY จึงข้ามขั้นตอนสร้างคำตอบ ดู context ด้านล่างเพื่อดูข้อมูลที่ระบบค้นเจอ)",
  "steps": {
    "1_keywords": [],
    "2_seedNodes": ["Province: กรุงเทพ"],
    "3_subgraph": { "hops": 2, "nodeCount": 8, "edgeCount": 17, "nodes": ["..."] },
    "4_context": [
      "## รายละเอียดสินค้า",
      "- หูฟังบลูทูธ SoundGo X1: ราคา 1290 บาท, คงเหลือ 25 ชิ้น. หูฟังไร้สายยี่ห้อ SoundGo กันน้ำ...",
      "...",
      "## ความสัมพันธ์ในกราฟ",
      "- [ลูกค้า] สมชาย ใจดี --ซื้อ (รวม 1 ชิ้น)--> [สินค้า] หูฟังบลูทูธ SoundGo X1",
      "- [ลูกค้า] สมชาย ใจดี --อาศัยอยู่ที่--> [จังหวัด] กรุงเทพ",
      "- [ลูกค้า] ฟาริด หะยีมะ --ซื้อ (รวม 1 ชิ้น)--> [สินค้า] หูฟังบลูทูธ SoundGo X1",
      "..."
    ]
  }
}
```

| ขั้นตอน | อ่านผลอย่างไร |
|---|---|
| `2_seedNodes` | ระบบเจอคำว่า "กรุงเทพ" ในคำถาม ตรงกับ node จังหวัด |
| `3_subgraph` | เดินออกไป 2 ก้าว ได้ 8 node (กรุงเทพ, ลูกค้า 3 คน, สินค้า 4 ชิ้น) |
| `4_context` | ข้อความที่จะส่งให้ Claude อ่าน **นี่คือสิ่งที่ "Retrieval" หาได้** |

ดูเพื่อนบ้านของ node ใดก็ได้ (เปิดในเบราว์เซอร์): http://localhost:3000/api/graph?name=กรุงเทพ&hops=1

---

## 11. ส่งกราฟไปดูใน Neo4j

### 11.1 `src/lib/neo4j.ts`

- ทุก node มี label `Entity` และ label ตามชนิด เช่น `(:Entity:Product)`, `(:Entity:Customer)`
- ใช้ `UNWIND $rows` ส่งข้อมูลทีละชุดใหญ่ เร็วกว่าส่งทีละ node มาก

```ts
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
```

### 11.2 API: `src/app/api/neo4j/sync/route.ts`

```ts
// POST /api/neo4j/sync : คัดลอกกราฟจาก PostgreSQL ไปไว้ใน Neo4j
import { handle } from "@/lib/http";
import { syncGraphToNeo4j } from "@/lib/neo4j";

export const POST = handle(async () => syncGraphToNeo4j());
```

### ✅ จุดทดสอบ 4: ดูกราฟใน Neo4j

```bash
curl.exe -X POST http://localhost:3000/api/neo4j/sync
```

```json
{"nodes":19,"edges":37,"browser":"เปิด http://localhost:7474 แล้วลองคำสั่ง MATCH (n)-[r]->(m) RETURN n, r, m"}
```

เปิด http://localhost:7474 เข้าระบบด้วย `neo4j` / `password123` แล้วลองคำสั่งเหล่านี้ทีละคำสั่ง

**ดูกราฟทั้งหมดเป็นภาพ**

```cypher
MATCH (n)-[r]->(m) RETURN n, r, m
```

**นับ node แต่ละชนิด**

```cypher
MATCH (n:Entity) RETURN [l IN labels(n) WHERE l <> "Entity"][0] AS type, count(*) AS total ORDER BY total DESC
```

**ลูกค้าในกรุงเทพซื้ออะไร** (คำถามเดียวกับจุดทดสอบ 3)

```cypher
MATCH (p:Province {name: "กรุงเทพ"})<-[:LIVES_IN]-(c:Customer)-[b:BOUGHT]->(prod:Product)
RETURN c.name AS customer, prod.name AS product, b.quantity AS qty
```

**รีวิวที่ได้คะแนนไม่เกิน 3**

```cypher
MATCH (c:Customer)-[r:REVIEWED]->(p:Product) WHERE r.rating <= 3
RETURN p.name AS product, r.rating AS rating, r.comment AS comment
```

**คนที่ซื้อหูฟัง ซื้ออะไรอีก**

```cypher
MATCH (:Product {name: "หูฟังบลูทูธ SoundGo X1"})<-[:BOUGHT]-(c:Customer)-[:BOUGHT]->(other:Product)
WHERE other.name <> "หูฟังบลูทูธ SoundGo X1"
RETURN other.name AS alsoBought, count(DISTINCT c) AS customers ORDER BY customers DESC
```

**ยอดขายแต่ละจังหวัด**

```cypher
MATCH (pr:Province)<-[:LIVES_IN]-(:Customer)-[b:BOUGHT]->(p:Product)
RETURN pr.name AS province, sum(b.quantity * p.price) AS sales ORDER BY sales DESC
```

**สิ่งที่ `expandSubgraph` ทำ เขียนเป็น Cypher** (เดิน 2 ก้าวจาก "กรุงเทพ")

```cypher
MATCH path = (s:Entity {name: "กรุงเทพ"})-[*1..2]-(m:Entity) RETURN path
```

---

## 12. เปิดใช้ Claude

### 12.1 ใส่ API key

1. สมัครและสร้าง key ที่ https://console.anthropic.com → **API Keys** → **Create Key**
2. เปิด `.env.local` ใส่ key

   ```ini
   ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
   ```

3. **หยุดแล้วรันเซิร์ฟเวอร์ใหม่** (`Ctrl + C` แล้ว `npm run dev`) เพราะ Next.js อ่าน `.env.local` ตอนเริ่มเท่านั้น

> **ห้ามส่ง `.env.local` ขึ้น git หรือแชร์ให้คนอื่น** key นี้ผูกกับการเรียกเก็บเงิน

### 12.2 สร้างกราฟใหม่ด้วย Claude

```bash
curl.exe -X POST http://localhost:3000/api/graph/build
```

- ใช้เวลาประมาณ 1-2 นาที (เรียก Claude 1 ครั้งต่อสินค้า รวม 8 ครั้ง)
- ผลจะมี `"usedLLM": true` และ node ชนิดใหม่: `Feature`, `UseCase`, `Problem`, `Brand`
- ดูใน `extraction` ว่า Claude ดึงอะไรออกมาจากแต่ละสินค้า

ตัวอย่าง (ผลจริงจะต่างไปบ้างในแต่ละครั้ง):

```json
{
  "product": "หูฟังบลูทูธ SoundGo X1",
  "facts": [
    { "relation": "MADE_BY", "target": "SoundGo" },
    { "relation": "HAS_FEATURE", "target": "กันน้ำ" },
    { "relation": "HAS_FEATURE", "target": "เบสแน่น" },
    { "relation": "GOOD_FOR", "target": "วิ่ง" },
    { "relation": "COMPLAINED_ABOUT", "target": "ใส่นานเจ็บหู" }
  ]
}
```

### ✅ จุดทดสอบ 5: ถามคำถามที่ต้องเชื่อมหลายต่อ

```http
POST http://localhost:3000/api/rag/ask
Content-Type: application/json

{ "question": "มีสินค้ากันน้ำอะไรบ้างที่ลูกค้าในกรุงเทพซื้อ" }
```

ครั้งนี้ `answer` จะเป็นคำตอบจาก Claude และ `1_keywords` จะมีคำที่ Claude ดึงจากคำถาม เช่น `["กันน้ำ", "กรุงเทพ"]`

คำถามอื่นที่น่าลอง:

- `ถ้าจะไปแคมป์ปิ้ง ควรซื้ออะไรบ้าง และลูกค้าติเรื่องอะไร`
- `สินค้ายี่ห้อ SoundGo มีปัญหาอะไรบ้างตามรีวิว` (ลอง `"hops": 1`)
- `สินค้าอะไรเหมาะกับคนชอบวิ่ง ราคาไม่เกิน 1000 บาท`

ส่งกราฟใหม่ไป Neo4j แล้วดูแนวคิดที่สินค้าใช้ร่วมกัน:

```bash
curl.exe -X POST http://localhost:3000/api/neo4j/sync
```

```cypher
MATCH (f:Feature)<-[:HAS_FEATURE|PRAISED_FOR]-(p:Product)
RETURN f.name AS feature, collect(DISTINCT p.name) AS products
ORDER BY size(products) DESC
```

```cypher
MATCH (p:Product)-[r]->(x) WHERE x:Feature OR x:UseCase OR x:Problem OR x:Brand
RETURN p, r, x
```

---

## 13. ไฟล์ทดสอบ API ทั้งหมด

สร้างไฟล์ `requests.http` ที่โฟลเดอร์นอกสุด แล้วกด **Send Request** ทีละอัน

```http
### ใช้กับ VS Code extension "REST Client" (กด Send Request เหนือแต่ละ request)
@base = http://localhost:3000

### 1. ใส่ข้อมูลตัวอย่าง
POST {{base}}/api/seed

### 2. สร้าง knowledge graph (ใช้ Claude ดึงแนวคิดจากคำอธิบายและรีวิว)
POST {{base}}/api/graph/build

### 2b. สร้างกราฟเฉพาะส่วนที่มาจากตาราง (ไม่ใช้ LLM)
POST {{base}}/api/graph/build
Content-Type: application/json

{ "useLLM": false }

### 3. ดูสรุปกราฟ
GET {{base}}/api/graph

### 4. ดูว่า "กันน้ำ" เชื่อมกับอะไรบ้าง
GET {{base}}/api/graph?name=กันน้ำ&hops=1

### 5. ถามแบบเชื่อมหลายต่อ: จังหวัด -> ลูกค้า -> สินค้า -> คุณสมบัติ
POST {{base}}/api/rag/ask
Content-Type: application/json

{ "question": "มีสินค้ากันน้ำอะไรบ้างที่ลูกค้าในกรุงเทพซื้อ" }

### 6. ถามหาสินค้าที่คล้ายกัน (เชื่อมผ่านการใช้งานเดียวกัน)
POST {{base}}/api/rag/ask
Content-Type: application/json

{ "question": "ถ้าจะไปแคมป์ปิ้ง ควรซื้ออะไรบ้าง และลูกค้าติเรื่องอะไร" }

### 7. ถามจากรีวิว
POST {{base}}/api/rag/ask
Content-Type: application/json

{ "question": "สินค้ายี่ห้อ SoundGo มีปัญหาอะไรบ้างตามรีวิว", "hops": 1 }

### 8. คัดลอกกราฟไป Neo4j (แล้วเปิด http://localhost:7474)
POST {{base}}/api/neo4j/sync

### --- API ร้านค้าปกติ ---

GET {{base}}/api/products

###
GET {{base}}/api/customers

###
GET {{base}}/api/orders

###
POST {{base}}/api/orders
Content-Type: application/json

{ "customerId": 2, "items": [{ "productId": 3, "quantity": 1 }] }

###
POST {{base}}/api/reviews
Content-Type: application/json

{ "productId": 3, "customerId": 2, "rating": 2, "comment": "แบตหมดเร็วกว่าที่คิด สายรัดข้อมือคัน" }
```

---

## 14. กิจกรรมทดลองในห้องเรียน

| กิจกรรม | สิ่งที่จะได้เรียนรู้ |
|---|---|
| ถามคำถามเดิมด้วย `"hops": 1`, `2`, `3` แล้วเทียบ `nodeCount` กับคำตอบ | hops มากขึ้น = ข้อมูลมากขึ้น แต่มีข้อมูลไม่เกี่ยวข้องปนมาด้วย |
| สร้างกราฟแบบ `{"useLLM": false}` แล้วถามเรื่อง "กันน้ำ" | ถ้าไม่มีขั้นดึงแนวคิด กราฟจะไม่รู้จักคุณสมบัติสินค้า |
| เพิ่มรีวิว "แบตหมดเร็ว" ให้สินค้าอื่น แล้ว build ใหม่ | สินค้าหลายชิ้นจะเชื่อมไปที่ node ปัญหาเดียวกัน |
| สร้าง order ใหม่ แล้วถามก่อนและหลัง build | กราฟไม่อัปเดตเอง ต้อง build ใหม่ |
| เปิด Neo4j แล้วหาว่าแนวคิดไหนเชื่อมกับสินค้ามากที่สุด | ภาพรวมของ knowledge graph |
| แก้ `ANSWER_SYSTEM` ใน `ask.ts` ให้ตอบเป็นตาราง | prompt ส่งผลต่อรูปแบบคำตอบ |

---

## 15. ปัญหาที่พบบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| `failed to connect to the docker API` | ยังไม่ได้เปิด Docker Desktop |
| `Bind for 0.0.0.0:5434 failed: port is already allocated` | พอร์ตถูกใช้ เปลี่ยน `"5434:5432"` ใน `docker-compose.yml` เป็นเลขอื่น และแก้ `DATABASE_URL` ใน `.env.local` ให้ตรงกัน |
| `Bind for 0.0.0.0:7474 failed` | Neo4j จากคู่มือที่ 2 ยังเปิดอยู่: `docker stop neo4j-lab` |
| `connect ECONNREFUSED 127.0.0.1:5434` | PostgreSQL ยังไม่เปิด: `docker compose up -d` |
| `No metadata for "Product" was found` | เกิดหลังแก้ไฟล์ entity ตอน `npm run dev` ให้หยุดแล้วรันใหม่ |
| `Unable to resolve signature of property decorator` | ยังไม่ได้ตั้ง `experimentalDecorators` ใน `tsconfig.json` (ข้อ 4.1) |
| `Cannot find module '../../src/app/[slug]/route.js'` | ลบโฟลเดอร์ `.next` แล้วรันใหม่ |
| `ยังไม่มีกราฟ ให้เรียก POST /api/graph/build ก่อน` | ทำตามข้อความ |
| `The client is unauthorized due to authentication failure` (Neo4j) | รหัสผ่านใน `.env.local` ไม่ตรงกับ `docker-compose.yml` ถ้าเคยเปิด Neo4j ด้วยรหัสอื่น ให้ลบ volume: `docker compose down -v` แล้ว `docker compose up -d` (ข้อมูลทั้งหมดจะหาย) |
| `usedLLM: false` ทั้งที่ใส่ key แล้ว | ยังไม่ได้รีสตาร์ต `npm run dev` |
| `401 authentication_error` จาก Claude | API key ผิด หรือคัดลอกมาไม่ครบ |
| ภาษาไทยเป็น `??????` | ใช้ REST Client หรือส่ง JSON จากไฟล์ด้วย `--data-binary "@ไฟล์.json"` |
| `2_seedNodes` เป็น `[]` | คำในคำถามไม่ตรงกับชื่อ node ใดเลย ลองใช้คำที่มีในข้อมูล เช่น ชื่อจังหวัด ชื่อสินค้า |

---

## 16. สรุปโครงสร้างไฟล์

```
rag-graph-shop/
├── docker-compose.yml            PostgreSQL + Neo4j
├── .env.local                    ค่าตั้งค่า (ห้ามส่งขึ้น git)
├── next.config.ts
├── tsconfig.json
├── requests.http                 ไฟล์ทดสอบ API
└── src/
    ├── entities/
    │   ├── shop.ts               ตารางร้านค้า
    │   └── graph.ts              ตาราง node/edge ของกราฟ
    ├── lib/
    │   ├── db.ts                 เชื่อม PostgreSQL (TypeORM)
    │   ├── http.ts               ตัวช่วยตอบ JSON / จัดการ error
    │   ├── seed.ts               ข้อมูลตัวอย่าง
    │   ├── llm.ts                เรียก Claude
    │   ├── neo4j.ts              ส่งกราฟไป Neo4j
    │   └── graph/
    │       ├── build.ts          ขั้นที่ 1 สร้างกราฟ
    │       ├── retrieve.ts       ขั้นที่ 2 หา node + เดินกราฟ + แปลงเป็นข้อความ
    │       └── ask.ts            ขั้นที่ 3 รวมทุกขั้นแล้วตอบ
    └── app/
        ├── route.ts              GET /  (Hello world)
        └── api/
            ├── seed/route.ts
            ├── categories/route.ts
            ├── products/route.ts
            ├── customers/route.ts
            ├── orders/route.ts
            ├── reviews/route.ts
            ├── graph/route.ts
            ├── graph/build/route.ts
            ├── rag/ask/route.ts
            └── neo4j/sync/route.ts
```

**ลำดับการเรียก API ในการใช้งาน**

```
POST /api/seed  ─►  POST /api/graph/build  ─►  POST /api/rag/ask  (ถามได้เรื่อยๆ)
                                           └►  POST /api/neo4j/sync  ─►  เปิด Neo4j Browser
```

### ข้อจำกัดของโปรเจกต์นี้ (ตั้งใจให้ง่าย)

- หา node ตั้งต้นด้วยการเทียบข้อความ ระบบจริงที่กราฟใหญ่มักใช้ **vector search** (เช่น pgvector) กับชื่อ node
- สร้างกราฟใหม่ทั้งหมดทุกครั้ง ระบบจริงควรอัปเดตเฉพาะส่วนที่เปลี่ยน
- `synchronize: true` ใช้ได้แค่ตอนเรียน งานจริงต้องใช้ migration
- ไม่มีระบบ login และไม่มีหน้าเว็บ

---

**ก่อนหน้า:** [คู่มือที่ 2: Neo4j เบื้องต้น](02-neo4j-basics.md) · **กลับไปที่:** [คู่มือที่ 1: Next.js เบื้องต้น](01-nextjs-basics.md)
