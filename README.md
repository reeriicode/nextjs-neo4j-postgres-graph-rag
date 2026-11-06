# rag-graph-simple

กรณีศึกษา **Graph RAG** กับระบบขายของแบบง่าย

- **Next.js** หน้าเว็บพื้นฐาน (แบบในคู่มือที่ 1) + API
- **Tailwind CSS** จัดหน้าเว็บ
- **PostgreSQL + TypeORM** เก็บทั้งข้อมูลร้านค้าและ knowledge graph
- **Neo4j** สำเนาของกราฟ ไว้ดูเป็นภาพและฝึกคำสั่ง Cypher
- **Claude** ใช้ดึง entity จากข้อความ และใช้ตอบคำถาม

ไม่มีระบบ login และไม่มี migration เพราะโปรเจกต์นี้มีไว้ศึกษาว่า Graph RAG ทำงานยังไงเท่านั้น

## หน้าเว็บ

เปิด http://localhost:3000 หลังรัน `npm run dev` (ต้องใส่ข้อมูลตัวอย่างก่อน ดู "วิธีรัน" ข้อ 4)

| URL | ไฟล์ | สิ่งที่สอน |
|---|---|---|
| `/` | [src/app/page.tsx](src/app/page.tsx) | หน้าแรก, ลิงก์ด้วย `<Link>`, วนลูปสร้างการ์ดด้วย `.map()` |
| `/about` | [src/app/about/page.tsx](src/app/about/page.tsx) | หน้าธรรมดา |
| `/products` | [src/app/products/page.tsx](src/app/products/page.tsx) + [src/components/ProductList.tsx](src/components/ProductList.tsx) | **Client Component** (`"use client"`): ฟอร์ม + เรียก API ด้วย `fetch` |
| `/products/1` | [src/app/products/[id]/page.tsx](src/app/products/[id]/page.tsx) | **Server Component**: อ่านฐานข้อมูลด้วย TypeORM ตรงๆ, ค่า `[id]` จาก URL |
| `/ask` | [src/app/ask/page.tsx](src/app/ask/page.tsx) + [src/components/AskBox.tsx](src/components/AskBox.tsx) | หน้าถามคำถาม Graph RAG แสดงผลทุกขั้นตอน |

เมนูด้านบนและฟอนต์ภาษาไทยอยู่ใน [src/app/layout.tsx](src/app/layout.tsx) (ใช้กับทุกหน้า)

## เอกสารประกอบการอบรม

| ไฟล์ | เนื้อหา |
|---|---|
| [docs/01-nextjs-basics.md](docs/01-nextjs-basics.md) | ติดตั้ง Next.js, สร้างหน้าเว็บ, สร้าง API, ให้หน้าเว็บเรียก API |
| [docs/02-neo4j-basics.md](docs/02-neo4j-basics.md) | Neo4j คืออะไร, ติดตั้งด้วย Docker, คำสั่ง Cypher พื้นฐาน |
| [docs/03-graph-rag-project.md](docs/03-graph-rag-project.md) | สร้างโปรเจกต์นี้ทีละขั้นตั้งแต่ศูนย์ พร้อมโค้ดครบทุกไฟล์ |
| [docs/04-postgres-basics.md](docs/04-postgres-basics.md) | PostgreSQL คืออะไร, ติดตั้งด้วย Docker, คำสั่ง SQL พื้นฐาน, ดูตารางของโปรเจกต์ (ควรอ่านก่อนคู่มือที่ 3) |

---

## Graph RAG ในโปรเจกต์นี้ทำงานยังไง

```
                ┌──────────── ขั้นที่ 1: สร้างกราฟ (POST /api/graph/build) ────────────┐
ตารางร้านค้า ──►│ A. แปลงตรงๆ: ลูกค้า --ซื้อ--> สินค้า --อยู่ในหมวด--> หมวดหมู่          │──► graph_nodes
คำอธิบาย/รีวิว ─►│ B. Claude อ่านข้อความ: สินค้า --มีคุณสมบัติ--> "กันน้ำ"                 │──► graph_edges
                └─────────────────────────────────────────────────────────────────┘

                ┌──────────── ขั้นที่ 2-3: ถามคำถาม (POST /api/rag/ask) ──────────────┐
คำถาม ─► Claude ดึง keyword ─► หา node ตั้งต้น ─► เดินกราฟ N ก้าว (SQL recursive)     │
                                                   ─► แปลงเป็นข้อความ ─► Claude ตอบ    │
                └─────────────────────────────────────────────────────────────────┘
```

### ตัวอย่างที่ RAG ธรรมดาตอบยาก แต่ Graph RAG ตอบได้

> "มีสินค้ากันน้ำอะไรบ้างที่ลูกค้าในกรุงเทพซื้อ"

ต้องเชื่อมข้อมูล 3 ต่อ: `กรุงเทพ ← ลูกค้า → ซื้อ → สินค้า → กันน้ำ`
ข้อมูลแต่ละชิ้นอยู่คนละที่ (ตารางลูกค้า, ตาราง order, คำอธิบายสินค้า) แต่กราฟเชื่อมไว้ให้แล้ว

### ไฟล์ที่ควรอ่าน (เรียงตามลำดับ)

| ไฟล์ | เนื้อหา |
|---|---|
| [src/entities/graph.ts](src/entities/graph.ts) | ตาราง node/edge และชนิดความสัมพันธ์ |
| [src/lib/graph/build.ts](src/lib/graph/build.ts) | **ขั้นที่ 1** สร้างกราฟจากตาราง + ให้ Claude ดึงแนวคิดจากข้อความ |
| [src/lib/graph/retrieve.ts](src/lib/graph/retrieve.ts) | **ขั้นที่ 2** หา node ตั้งต้น, เดินกราฟด้วย `WITH RECURSIVE`, แปลงเป็นข้อความ |
| [src/lib/graph/ask.ts](src/lib/graph/ask.ts) | **ขั้นที่ 3** รวมทุกขั้นแล้วให้ Claude ตอบ |
| [src/entities/shop.ts](src/entities/shop.ts) | ตารางร้านค้าปกติ (หมวดหมู่, สินค้า, ลูกค้า, order, รีวิว) |

---

## วิธีรัน

**1. เปิด PostgreSQL (พอร์ต 5434) และ Neo4j (พอร์ต 7474, 7687)** (ต้องเปิด Docker Desktop ก่อน)

```bash
docker compose up -d
```

**2. ตั้งค่า environment**

```bash
cp .env.example .env.local
```

แล้วใส่ `ANTHROPIC_API_KEY` ใน `.env.local` (ถ้ายังไม่ใส่ก็รันได้ แต่จะไม่มีขั้นตอนที่ใช้ Claude)

**3. ติดตั้งและรัน**

```bash
npm install
npm run dev
```

ตารางจะถูกสร้างอัตโนมัติตอนเรียก API ครั้งแรก (`synchronize: true`)

> ถ้าแก้ `next.config.ts` ต้องหยุดแล้วรัน `npm run dev` ใหม่

**4. ลองเรียก API ตามลำดับ** (ดูตัวอย่างทั้งหมดใน [requests.http](requests.http))

```bash
curl -X POST http://localhost:3000/api/seed
```

```bash
curl -X POST http://localhost:3000/api/graph/build
```

```bash
curl -X POST http://localhost:3000/api/rag/ask -H "Content-Type: application/json" -d "{\"question\":\"มีสินค้ากันน้ำอะไรบ้างที่ลูกค้าในกรุงเทพซื้อ\"}"
```

---

## API ทั้งหมด

| Method | Path | ใช้ทำอะไร |
|---|---|---|
| POST | `/api/seed` | ล้างฐานข้อมูลแล้วใส่ข้อมูลตัวอย่าง |
| GET/POST | `/api/categories` | หมวดหมู่ |
| GET/POST | `/api/products` | สินค้า |
| GET/POST | `/api/customers` | ลูกค้า |
| GET/POST | `/api/orders` | คำสั่งซื้อ (ตัดสต็อกใน transaction) |
| GET/POST | `/api/reviews` | รีวิว |
| POST | `/api/graph/build` | สร้างกราฟใหม่ทั้งหมด (`{"useLLM": false}` = ใช้แค่ข้อมูลจากตาราง) |
| GET | `/api/graph` | สรุปกราฟ: จำนวน node/edge และแนวคิดที่เชื่อมกับสินค้ามากที่สุด |
| GET | `/api/graph?name=กันน้ำ&hops=1` | ดูว่า node นี้เชื่อมกับอะไรบ้าง |
| POST | `/api/rag/ask` | ถามคำถาม `{"question": "...", "hops": 2}` |
| POST | `/api/neo4j/sync` | คัดลอกกราฟไป Neo4j แล้วเปิดดูที่ http://localhost:7474 (`neo4j` / `password123`) |

ผลของ `/api/rag/ask` แสดงทุกขั้นตอน (`steps`) ให้ดูว่าแต่ละขั้นได้อะไร:
keyword ที่ดึงได้, node ตั้งต้น, subgraph ที่เดินเจอ และข้อความ context ที่ส่งให้ Claude

---

## ทดลองเพิ่มเติม

- **เปลี่ยน `hops`** เป็น 1, 2, 3 แล้วดูว่า context ใหญ่ขึ้นแค่ไหนและคำตอบเปลี่ยนไปยังไง
- **เพิ่มรีวิวใหม่** ผ่าน `POST /api/reviews` เช่น ติว่า "แบตหมดเร็ว" แล้ว build กราฟใหม่ จะเห็นสินค้านั้นเชื่อมกับ node ปัญหาเดิม
- **สร้าง order ใหม่** แล้วถามคำถามก่อนและหลัง build กราฟ (กราฟไม่ได้อัปเดตเอง ต้อง build ใหม่)
- **build แบบ `useLLM: false`** แล้วถามคำถามเรื่องคุณสมบัติ จะเห็นว่าตอบไม่ได้ เพราะไม่มี node แนวคิด

## ข้อจำกัด (ตั้งใจให้ง่าย)

- หา node ตั้งต้นด้วยการเทียบข้อความ ระบบจริงที่กราฟใหญ่มักใช้ vector search (เช่น pgvector) กับชื่อ node
- build กราฟใหม่ทั้งหมดทุกครั้ง ระบบจริงควรอัปเดตเฉพาะส่วนที่เปลี่ยน
- `synchronize: true` สะดวกตอนศึกษา แต่ใช้บน production ไม่ได้ ต้องใช้ migration
