# คู่มือที่ 2: Neo4j เบื้องต้น (คืออะไร ติดตั้ง และคำสั่งพื้นฐาน)

> เป้าหมาย: เมื่อจบคู่มือนี้ ผู้เรียนจะเข้าใจว่า graph database ต่างจากฐานข้อมูลแบบตารางอย่างไร ติดตั้ง Neo4j ได้ และเขียนคำสั่ง Cypher พื้นฐานได้
>
> ทดสอบกับ **Neo4j 5.26 Community** (Docker image `neo4j:5-community`) บน Windows 11

---

## สารบัญ

1. [Neo4j คืออะไร](#1-neo4j-คืออะไร)
2. [ส่วนประกอบของกราฟ](#2-ส่วนประกอบของกราฟ)
3. [ติดตั้ง Neo4j](#3-ติดตั้ง-neo4j)
4. [เข้าใช้งาน Neo4j Browser](#4-เข้าใช้งาน-neo4j-browser)
5. [Cypher: สร้างข้อมูล (CREATE)](#5-cypher-สร้างข้อมูล-create)
6. [Cypher: ค้นหาข้อมูล (MATCH)](#6-cypher-ค้นหาข้อมูล-match)
7. [Cypher: สร้างความสัมพันธ์](#7-cypher-สร้างความสัมพันธ์)
8. [Cypher: ค้นหาตามความสัมพันธ์ (จุดเด่นของกราฟ)](#8-cypher-ค้นหาตามความสัมพันธ์-จุดเด่นของกราฟ)
9. [Cypher: แก้ไขและลบ](#9-cypher-แก้ไขและลบ)
10. [Constraint และ Index](#10-constraint-และ-index)
11. [เทียบ Cypher กับ SQL](#11-เทียบ-cypher-กับ-sql)
12. [ใช้ cypher-shell (บรรทัดคำสั่ง)](#12-ใช้-cypher-shell-บรรทัดคำสั่ง)
13. [เรียก Neo4j จากโค้ด Node.js](#13-เรียก-neo4j-จากโค้ด-nodejs)
14. [คำสั่ง Docker ที่ใช้บ่อย](#14-คำสั่ง-docker-ที่ใช้บ่อย)
15. [ปัญหาที่พบบ่อย](#15-ปัญหาที่พบบ่อย)
16. [แบบฝึกหัด](#16-แบบฝึกหัด)

---

## 1. Neo4j คืออะไร

**Neo4j** คือ **graph database** เก็บข้อมูลเป็น "จุด" กับ "เส้นเชื่อม" แทนการเก็บเป็นตาราง และใช้ภาษา **Cypher** ในการค้นหา

ตัวอย่าง: "ลูกค้าที่อยู่กรุงเทพซื้ออะไรบ้าง"

**ฐานข้อมูลแบบตาราง (SQL)** ต้อง JOIN หลายตาราง

```sql
SELECT c.name, p.name
FROM customers c
JOIN orders o       ON o.customer_id = c.id
JOIN order_items i  ON i.order_id = o.id
JOIN products p     ON p.id = i.product_id
WHERE c.province = 'กรุงเทพ';
```

**Neo4j (Cypher)** เขียนเป็นรูปเส้นทางตรงๆ

```cypher
MATCH (:City {name: "กรุงเทพ"})<-[:LIVES_IN]-(c:Person)-[:BOUGHT]->(p:Product)
RETURN c.name, p.name
```

### เหมาะกับงานแบบไหน

| เหมาะ | ไม่ค่อยเหมาะ |
|---|---|
| ข้อมูลที่ความสัมพันธ์สำคัญ เช่น เครือข่ายคน, ระบบแนะนำสินค้า | ข้อมูลตารางธรรมดา เช่น บัญชี, สต็อก |
| ค้นหาข้อมูลที่ต้องเชื่อมหลายต่อ (multi-hop) | รายงานสรุปยอดจำนวนมาก |
| Knowledge Graph และ **Graph RAG** | งานที่ต้อง transaction ซับซ้อน |

> ในโปรเจกต์ของคู่มือที่ 3 เราใช้ทั้งสองแบบ: PostgreSQL เก็บข้อมูลร้านค้า ส่วน Neo4j ไว้ดูและค้นหากราฟ

---

## 2. ส่วนประกอบของกราฟ

```
        (สมชาย:Person {age: 30})
               │
               │ [:BOUGHT {qty: 1}]
               ▼
        (หูฟัง:Product {price: 1290})
```

| ส่วนประกอบ | คืออะไร | เขียนใน Cypher | ตัวอย่าง |
|---|---|---|---|
| **Node** (โหนด) | สิ่งของ/คน/สถานที่ | วงเล็บกลม `( )` | `(p)` |
| **Label** | ชนิดของ node | `:ชื่อ` | `(p:Person)` |
| **Relationship** | เส้นเชื่อม มีทิศทาง | `-[ ]->` | `-[:BOUGHT]->` |
| **Type** | ชนิดของเส้น | `:ชื่อ` ในวงเล็บเหลี่ยม | `[:LIVES_IN]` |
| **Property** | ข้อมูลใน node หรือเส้น | `{key: value}` | `{name: "สมชาย", age: 30}` |

ธรรมเนียมการตั้งชื่อ:

- Label: ขึ้นต้นตัวใหญ่ เช่น `Person`, `Product`
- Relationship: ตัวใหญ่ทั้งหมด คั่นด้วย `_` เช่น `BOUGHT`, `LIVES_IN`
- Property: ตัวเล็ก เช่น `name`, `price`

---

## 3. ติดตั้ง Neo4j

มี 3 วิธี เลือกวิธีเดียว **(แนะนำวิธี A)**

### วิธี A: Docker (แนะนำ)

1. ติดตั้ง **Docker Desktop**: https://www.docker.com/products/docker-desktop/ แล้วเปิดโปรแกรมให้ขึ้นสถานะ Running
2. เช็กว่า Docker พร้อม

   ```bash
   docker version
   ```

   ต้องเห็นทั้งส่วน `Client` และ `Server` (ถ้าไม่มี Server แปลว่ายังไม่ได้เปิด Docker Desktop)

3. สร้างและเปิด Neo4j (คำสั่งเดียว บรรทัดเดียว)

   ```bash
   docker run -d --name neo4j-lab -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/password123 -v neo4j-lab-data:/data neo4j:5-community
   ```

   | ส่วนของคำสั่ง | ความหมาย |
   |---|---|
   | `-d` | รันเบื้องหลัง |
   | `--name neo4j-lab` | ตั้งชื่อ container |
   | `-p 7474:7474` | พอร์ตหน้าเว็บ Neo4j Browser |
   | `-p 7687:7687` | พอร์ต Bolt สำหรับโปรแกรมเชื่อมต่อ |
   | `-e NEO4J_AUTH=neo4j/password123` | ชื่อผู้ใช้/รหัสผ่าน (รหัสผ่านต้องยาว 8 ตัวขึ้นไป) |
   | `-v neo4j-lab-data:/data` | เก็บข้อมูลไว้ ปิดเครื่องแล้วไม่หาย |
   | `neo4j:5-community` | เวอร์ชันฟรี |

4. รอประมาณ 20-30 วินาที แล้วเช็กว่ารันอยู่

   ```bash
   docker ps
   ```

   ต้องเห็นบรรทัดที่มี `neo4j-lab` และสถานะ `Up`

5. ดู log ถ้าต้องการรู้ว่าพร้อมแล้วหรือยัง (กด `Ctrl + C` เพื่อออก)

   ```bash
   docker logs -f neo4j-lab
   ```

   เมื่อเห็นบรรทัด `Started.` แปลว่าพร้อมใช้

### วิธี B: Neo4j Desktop

ดาวน์โหลดจาก https://neo4j.com/download/ ติดตั้งแล้วกด **New → Create project → Add → Local DBMS** ตั้งรหัสผ่าน แล้วกด **Start**

### วิธี C: Neo4j AuraDB Free (บนคลาวด์ ไม่ต้องติดตั้ง)

สมัครที่ https://neo4j.com/cloud/aura-free/ สร้าง instance แบบ Free แล้ว **ดาวน์โหลดไฟล์รหัสผ่านเก็บไว้** (ระบบให้ดูได้ครั้งเดียว)

---

## 4. เข้าใช้งาน Neo4j Browser

1. เปิดเบราว์เซอร์ไปที่ **http://localhost:7474**
2. หน้า **Connect to instance** กรอก

   | ช่อง | ค่า |
   |---|---|
   | Protocol | `neo4j://` |
   | Connection URL | `localhost:7687` |
   | Database user | `neo4j` |
   | Password | `password123` |

3. กด **Connect**

**วิธีใช้:**

- พิมพ์คำสั่ง Cypher ในช่องด้านบน แล้วกด `Ctrl + Enter` (หรือปุ่ม ▶) เพื่อรัน
- **รันทีละคำสั่ง** ในคู่มือนี้
- ผลแสดงได้หลายแบบ: **Graph** (ภาพ), **Table** (ตาราง), **Text**
- คลิก node ในภาพเพื่อดู property, ดับเบิลคลิกเพื่อดู node ที่เชื่อมอยู่

---

## 5. Cypher: สร้างข้อมูล (CREATE)

> เราจะสร้างข้อมูลร้านค้าเล็กๆ: ลูกค้า 3 คน, สินค้า 3 ชิ้น, จังหวัด 2 จังหวัด

**สร้าง node ทีละตัว**

```cypher
CREATE (:Person {name: "สมชาย", age: 30})
```

**สร้างหลายตัวในคำสั่งเดียว** (คั่นด้วย `,`)

```cypher
CREATE (:Person {name: "อามิ", age: 25}), (:Person {name: "วิภา", age: 28})
```

```cypher
CREATE (:Product {name: "หูฟัง", price: 1290}), (:Product {name: "ลำโพง", price: 990}), (:Product {name: "กระติกน้ำ", price: 590})
```

```cypher
CREATE (:City {name: "กรุงเทพ"}), (:City {name: "ปัตตานี"})
```

**ดูทุกอย่างที่สร้าง**

```cypher
MATCH (n) RETURN n
```

---

## 6. Cypher: ค้นหาข้อมูล (MATCH)

รูปแบบ: `MATCH รูปแบบที่ต้องการหา` → `WHERE เงื่อนไข` → `RETURN สิ่งที่จะแสดง`

**ดูลูกค้าทุกคน**

```cypher
MATCH (p:Person) RETURN p.name, p.age
```

ผลลัพธ์:

| p.name | p.age |
|---|---|
| "สมชาย" | 30 |
| "อามิ" | 25 |
| "วิภา" | 28 |

**กรองด้วย WHERE และเรียงด้วย ORDER BY**

```cypher
MATCH (p:Product) WHERE p.price < 1000 RETURN p.name, p.price ORDER BY p.price
```

| p.name | p.price |
|---|---|
| "กระติกน้ำ" | 590 |
| "ลำโพง" | 990 |

**หาด้วย property แบบย่อ** (เหมือน `WHERE p.name = "สมชาย"`)

```cypher
MATCH (p:Person {name: "สมชาย"}) RETURN p
```

**ตัวกรองอื่นๆ ที่ใช้บ่อย**

```cypher
MATCH (p:Product) WHERE p.name CONTAINS "หู" RETURN p.name
```

```cypher
MATCH (p:Person) WHERE p.age >= 25 AND p.age <= 28 RETURN p.name, p.age
```

```cypher
MATCH (p:Product) RETURN p.name, p.price ORDER BY p.price DESC LIMIT 2
```

---

## 7. Cypher: สร้างความสัมพันธ์

ขั้นตอน: **MATCH หา node ทั้งสองฝั่งก่อน** แล้วค่อย **CREATE เส้นเชื่อม**

**การซื้อ** (เก็บจำนวนที่ซื้อไว้ในเส้น)

```cypher
MATCH (a:Person {name: "สมชาย"}), (b:Product {name: "หูฟัง"}) CREATE (a)-[:BOUGHT {qty: 1}]->(b)
```

```cypher
MATCH (a:Person {name: "สมชาย"}), (b:Product {name: "กระติกน้ำ"}) CREATE (a)-[:BOUGHT {qty: 2}]->(b)
```

```cypher
MATCH (a:Person {name: "อามิ"}), (b:Product {name: "หูฟัง"}) CREATE (a)-[:BOUGHT {qty: 1}]->(b)
```

```cypher
MATCH (a:Person {name: "อามิ"}), (b:Product {name: "ลำโพง"}) CREATE (a)-[:BOUGHT {qty: 1}]->(b)
```

```cypher
MATCH (a:Person {name: "วิภา"}), (b:Product {name: "ลำโพง"}) CREATE (a)-[:BOUGHT {qty: 3}]->(b)
```

**ที่อยู่**

```cypher
MATCH (a:Person {name: "สมชาย"}), (c:City {name: "กรุงเทพ"}) CREATE (a)-[:LIVES_IN]->(c)
```

```cypher
MATCH (a:Person {name: "อามิ"}), (c:City {name: "ปัตตานี"}) CREATE (a)-[:LIVES_IN]->(c)
```

```cypher
MATCH (a:Person {name: "วิภา"}), (c:City {name: "กรุงเทพ"}) CREATE (a)-[:LIVES_IN]->(c)
```

**ดูภาพกราฟทั้งหมด**

```cypher
MATCH (n)-[r]->(m) RETURN n, r, m
```

ข้อมูลที่ได้ (ในหน้าเว็บจะเป็นภาพวงกลมเชื่อมกัน):

```
(สมชาย)   ──BOUGHT──►   (หูฟัง)       (สมชาย)   ──LIVES_IN──► (กรุงเทพ)
(สมชาย)   ──BOUGHT──►   (กระติกน้ำ)    (วิภา)    ──LIVES_IN──► (กรุงเทพ)
(อามิ)     ──BOUGHT──►   (หูฟัง)       (อามิ)     ──LIVES_IN──► (ปัตตานี)
(อามิ)     ──BOUGHT──►   (ลำโพง)
(วิภา)    ──BOUGHT──►   (ลำโพง)
```

สังเกตว่า "หูฟัง" มีเส้นเข้า 2 เส้น และ "กรุงเทพ" มีเส้นเข้า 2 เส้น node เหล่านี้คือจุดที่ทำให้ข้อมูลเชื่อมถึงกัน

> **ระวัง:** รัน `CREATE` ซ้ำจะได้ข้อมูลซ้ำ ถ้าต้องการ "สร้างเมื่อยังไม่มี" ให้ใช้ `MERGE` (ข้อ 9)

---

## 8. Cypher: ค้นหาตามความสัมพันธ์ (จุดเด่นของกราฟ)

**ใครซื้ออะไร**

```cypher
MATCH (p:Person)-[:BOUGHT]->(prod:Product) RETURN p.name, prod.name
```

**อ่าน property ของเส้น** (ตั้งชื่อเส้นเป็น `b`)

```cypher
MATCH (p:Person)-[b:BOUGHT]->(prod:Product) RETURN p.name, b.qty, prod.name
```

**เชื่อม 2 ต่อ: ลูกค้าในกรุงเทพซื้ออะไร** (จังหวัด → ลูกค้า → สินค้า)

```cypher
MATCH (c:City {name: "กรุงเทพ"})<-[:LIVES_IN]-(p:Person)-[:BOUGHT]->(prod:Product) RETURN p.name, prod.name
```

| p.name | prod.name |
|---|---|
| "สมชาย" | "กระติกน้ำ" |
| "สมชาย" | "หูฟัง" |
| "วิภา" | "ลำโพง" |

**ระบบแนะนำสินค้า: คนที่ซื้อหูฟัง ซื้ออะไรอีก**

```cypher
MATCH (:Product {name: "หูฟัง"})<-[:BOUGHT]-(p:Person)-[:BOUGHT]->(other:Product)
WHERE other.name <> "หูฟัง"
RETURN other.name AS product, count(p) AS buyers
ORDER BY buyers DESC
```

| product | buyers |
|---|---|
| "ลำโพง" | 1 |
| "กระติกน้ำ" | 1 |

**สรุปยอด: แต่ละคนซื้อกี่ชิ้น เป็นเงินเท่าไร** (`sum`, `count` ทำงานเหมือน GROUP BY อัตโนมัติ)

```cypher
MATCH (p:Person)-[b:BOUGHT]->(prod:Product)
RETURN p.name, sum(b.qty) AS items, sum(b.qty * prod.price) AS total
ORDER BY total DESC
```

| p.name | items | total |
|---|---|---|
| "วิภา" | 3 | 2970 |
| "สมชาย" | 3 | 2470 |
| "อามิ" | 2 | 2280 |

**เดินกราฟหลายก้าว: ทุกอย่างที่อยู่ห่างจากสมชายไม่เกิน 2 ก้าว**

`[*1..2]` = เส้นอะไรก็ได้ 1 ถึง 2 เส้น ไม่สนทิศทาง

```cypher
MATCH path = (p:Person {name: "สมชาย"})-[*1..2]-(x)
RETURN length(path) AS hops, x.name
ORDER BY hops
```

| hops | x.name |
|---|---|
| 1 | "หูฟัง" |
| 1 | "กระติกน้ำ" |
| 1 | "กรุงเทพ" |
| 2 | "อามิ" ← ซื้อหูฟังเหมือนกัน |
| 2 | "วิภา" ← อยู่กรุงเทพเหมือนกัน |

> **นี่คือหัวใจของ Graph RAG:** เริ่มจาก node ที่เกี่ยวกับคำถาม แล้วเดินออกไป 1-2 ก้าว เพื่อเก็บข้อมูลที่เกี่ยวข้องทั้งหมดไปให้ AI อ่าน (ดูคู่มือที่ 3)

ดูเป็นภาพ (เปลี่ยน RETURN เป็น `path`):

```cypher
MATCH path = (p:Person {name: "สมชาย"})-[*1..2]-(x) RETURN path
```

---

## 9. Cypher: แก้ไขและลบ

**แก้ไข property ด้วย SET** (เพิ่ม property ใหม่ได้ด้วย)

```cypher
MATCH (p:Product {name: "หูฟัง"}) SET p.price = 1190, p.stock = 20 RETURN p.name, p.price, p.stock
```

**MERGE = หาก่อน ถ้าไม่มีค่อยสร้าง** (รันซ้ำกี่ครั้งก็ได้ node เดียว)

```cypher
MERGE (c:City {name: "สงขลา"}) RETURN c.name
```

รันคำสั่งเดิมอีกรอบ แล้วนับ:

```cypher
MATCH (c:City) RETURN count(c) AS cities
```

ได้ `3` (กรุงเทพ, ปัตตานี, สงขลา) ไม่ใช่ 4

**ลบ property**

```cypher
MATCH (p:Product {name: "หูฟัง"}) REMOVE p.stock RETURN p
```

**ลบเส้นเชื่อม**

```cypher
MATCH (:Person {name: "วิภา"})-[r:BOUGHT]->(:Product {name: "ลำโพง"}) DELETE r
```

**ลบ node** (`DETACH DELETE` = ลบเส้นที่ติดอยู่ด้วย ถ้าใช้ `DELETE` เฉยๆ กับ node ที่มีเส้นจะ error)

```cypher
MATCH (p:Person {name: "วิภา"}) DETACH DELETE p
```

**ล้างทุกอย่างในฐานข้อมูล** (ระวัง! ใช้ตอนฝึกเท่านั้น)

```cypher
MATCH (n) DETACH DELETE n
```

---

## 10. Constraint และ Index

**Constraint** กันข้อมูลซ้ำ เช่น ห้ามมีสินค้าชื่อซ้ำ (และสร้าง index ให้อัตโนมัติ)

```cypher
CREATE CONSTRAINT product_name IF NOT EXISTS FOR (p:Product) REQUIRE p.name IS UNIQUE
```

ลองสร้างสินค้าชื่อซ้ำ จะ error:

```cypher
CREATE (:Product {name: "ลำโพง", price: 500})
```

**Index** ทำให้ค้นหาเร็วขึ้น (ไม่ได้กันข้อมูลซ้ำ)

```cypher
CREATE INDEX person_name IF NOT EXISTS FOR (p:Person) ON (p.name)
```

**ดูรายการ**

```cypher
SHOW CONSTRAINTS
```

```cypher
SHOW INDEXES
```

**ลบ**

```cypher
DROP CONSTRAINT product_name
```

```cypher
DROP INDEX person_name
```

**คำสั่งดูภาพรวมฐานข้อมูล**

```cypher
CALL db.schema.visualization()
```

```cypher
MATCH (n) RETURN labels(n) AS label, count(*) AS total
```

---

## 11. เทียบ Cypher กับ SQL

| งาน | SQL | Cypher |
|---|---|---|
| ตาราง / ชนิดข้อมูล | `TABLE customers` | Label `:Person` |
| แถว | row | node |
| foreign key / JOIN | `JOIN ... ON ...` | relationship `-[:BOUGHT]->` |
| เพิ่มข้อมูล | `INSERT INTO ...` | `CREATE (...)` |
| ค้นหา | `SELECT ... FROM ... WHERE` | `MATCH ... WHERE ... RETURN` |
| แก้ไข | `UPDATE ... SET` | `MATCH ... SET` |
| ลบ | `DELETE FROM` | `MATCH ... DETACH DELETE` |
| เพิ่มถ้ายังไม่มี | `INSERT ... ON CONFLICT DO NOTHING` | `MERGE` |
| จัดกลุ่ม | `GROUP BY` | อัตโนมัติเมื่อใช้ `count()`, `sum()` |
| เรียง/จำกัด | `ORDER BY ... LIMIT` | `ORDER BY ... LIMIT` |
| หาเส้นทางหลายต่อ | WITH RECURSIVE (ยาก) | `-[*1..3]-` (สั้น) |

---

## 12. ใช้ cypher-shell (บรรทัดคำสั่ง)

นอกจากหน้าเว็บ ยังสั่ง Cypher ผ่าน Terminal ได้

**เข้าโหมดพิมพ์คำสั่ง**

```bash
docker exec -it neo4j-lab cypher-shell -u neo4j -p password123
```

พิมพ์คำสั่งแล้ว **ต้องปิดท้ายด้วย `;`** เช่น

```
MATCH (n) RETURN count(n);
```

ออกด้วย `:exit`

**รันคำสั่งจากไฟล์** (เหมาะกับคำสั่งภาษาไทยจำนวนมาก)

1. สร้างไฟล์ `practice.cypher` ใน VS Code ใส่คำสั่งหลายบรรทัด แต่ละคำสั่งปิดท้ายด้วย `;`

   ```cypher
   CREATE (:Person {name: "ทดสอบ", age: 20});
   MATCH (p:Person) RETURN p.name, p.age;
   ```

2. รัน (PowerShell และ Command Prompt ใช้คำสั่งนี้)

   ```bash
   cmd /c "docker exec -i neo4j-lab cypher-shell -u neo4j -p password123 < practice.cypher"
   ```

   Git Bash / Mac / Linux:

   ```bash
   docker exec -i neo4j-lab cypher-shell -u neo4j -p password123 < practice.cypher
   ```

---

## 13. เรียก Neo4j จากโค้ด Node.js

ติดตั้ง driver:

```bash
npm install neo4j-driver
```

ตัวอย่างไฟล์ `neo4j-test.mjs`:

```js
import neo4j from "neo4j-driver";

const driver = neo4j.driver("bolt://localhost:7687", neo4j.auth.basic("neo4j", "password123"));

// ส่งค่าเข้า query ผ่าน parameter ($city) เสมอ ห้ามต่อ string เอง
const { records } = await driver.executeQuery(
  `MATCH (c:City {name: $city})<-[:LIVES_IN]-(p:Person)-[:BOUGHT]->(prod:Product)
   RETURN p.name AS person, prod.name AS product`,
  { city: "กรุงเทพ" },
);

for (const r of records) {
  console.log(r.get("person"), "ซื้อ", r.get("product"));
}

await driver.close();
```

รัน:

```bash
node neo4j-test.mjs
```

> โปรเจกต์ในคู่มือที่ 3 ใช้วิธีนี้ส่งกราฟจาก PostgreSQL ไปยัง Neo4j (ไฟล์ `src/lib/neo4j.ts`)

---

## 14. คำสั่ง Docker ที่ใช้บ่อย

| ต้องการ | คำสั่ง |
|---|---|
| ดู container ที่รันอยู่ | `docker ps` |
| หยุด Neo4j | `docker stop neo4j-lab` |
| เปิดอีกครั้ง | `docker start neo4j-lab` |
| ดู log | `docker logs -f neo4j-lab` |
| ลบ container (ข้อมูลยังอยู่ใน volume) | `docker rm -f neo4j-lab` |
| ลบข้อมูลทั้งหมดด้วย | `docker volume rm neo4j-lab-data` |

> **ก่อนเริ่มคู่มือที่ 3** ให้หยุด `neo4j-lab` ก่อน (`docker stop neo4j-lab`) เพราะโปรเจกต์จะเปิด Neo4j ตัวใหม่ที่ใช้พอร์ต 7474 และ 7687 เหมือนกัน

---

## 15. ปัญหาที่พบบ่อย

| อาการ | วิธีแก้ |
|---|---|
| `docker: error during connect` / `failed to connect to the docker API` | ยังไม่ได้เปิด Docker Desktop หรือยังเปิดไม่เสร็จ รอให้ขึ้น Running |
| `Bind for 0.0.0.0:7474 failed: port is already allocated` | มีโปรแกรมอื่นใช้พอร์ตอยู่ (มักเป็น Neo4j อีกตัว) ใช้ `docker ps` ดูแล้ว `docker stop ชื่อ` |
| `The client is unauthorized due to authentication failure` | รหัสผ่านผิด ถ้าลืมให้ลบ container และ volume แล้วสร้างใหม่ (ข้อ 14) |
| เปิด http://localhost:7474 ไม่ขึ้น | รอ 20-30 วินาทีหลังสั่ง `docker run` แล้วดู `docker logs neo4j-lab` |
| ได้ node ซ้ำหลายตัว | รัน `CREATE` ซ้ำ ใช้ `MERGE` แทน หรือล้างแล้วสร้างใหม่ |
| `Cannot delete node<..>, because it still has relationships` | ใช้ `DETACH DELETE` แทน `DELETE` |
| คำสั่งไม่ทำงาน แต่ไม่ error | ตัวพิมพ์เล็ก-ใหญ่ต้องตรง: `:Person` กับ `:person` ถือเป็นคนละ label |

---

## 16. แบบฝึกหัด

ใช้ข้อมูลจากข้อ 5-7 (ถ้าลบไปแล้ว ให้สร้างใหม่)

1. เพิ่มลูกค้า "ฟาริด" อายุ 35 อยู่กรุงเทพ ซื้อหูฟัง 1 ชิ้น
2. หาว่าลูกค้าแต่ละจังหวัดซื้อสินค้ารวมกี่ชิ้น
3. เพิ่มสินค้า "พัดลม" ราคา 450 แล้วหาสินค้าที่ไม่มีใครซื้อเลย (คำใบ้: `WHERE NOT (p)<-[:BOUGHT]-()`)
4. สร้าง node `:Category {name: "อิเล็กทรอนิกส์"}` แล้วเชื่อมหูฟังและลำโพงด้วยเส้น `:IN_CATEGORY`
5. หาลูกค้าที่ซื้อสินค้าในหมวด "อิเล็กทรอนิกส์" (เชื่อม 2 ต่อ)

<details>
<summary>เฉลย</summary>

```cypher
// 1
CREATE (f:Person {name: "ฟาริด", age: 35})
WITH f
MATCH (c:City {name: "กรุงเทพ"}), (p:Product {name: "หูฟัง"})
CREATE (f)-[:LIVES_IN]->(c), (f)-[:BOUGHT {qty: 1}]->(p)
```

```cypher
// 2
MATCH (c:City)<-[:LIVES_IN]-(:Person)-[b:BOUGHT]->(:Product)
RETURN c.name, sum(b.qty) AS items ORDER BY items DESC
```

```cypher
// 3 (สองคำสั่ง รันทีละคำสั่ง)
CREATE (:Product {name: "พัดลม", price: 450})
```

```cypher
MATCH (p:Product) WHERE NOT (p)<-[:BOUGHT]-() RETURN p.name
```

```cypher
// 4
MERGE (cat:Category {name: "อิเล็กทรอนิกส์"})
WITH cat
MATCH (p:Product) WHERE p.name IN ["หูฟัง", "ลำโพง"]
MERGE (p)-[:IN_CATEGORY]->(cat)
```

```cypher
// 5
MATCH (:Category {name: "อิเล็กทรอนิกส์"})<-[:IN_CATEGORY]-(:Product)<-[:BOUGHT]-(p:Person)
RETURN DISTINCT p.name
```

</details>

---

**ก่อนหน้า:** [คู่มือที่ 1: Next.js เบื้องต้น](01-nextjs-basics.md) · **ต่อไป:** [คู่มือที่ 4: PostgreSQL เบื้องต้น](04-postgres-basics.md) แล้วจึง [คู่มือที่ 3: โปรเจกต์ Graph RAG](03-graph-rag-project.md)
