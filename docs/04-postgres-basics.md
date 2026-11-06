# คู่มือที่ 4: PostgreSQL เบื้องต้น (ติดตั้ง และคำสั่ง SQL พื้นฐาน)

> เป้าหมาย: เมื่อจบคู่มือนี้ ผู้เรียนจะติดตั้ง PostgreSQL ได้ สร้างตาราง เพิ่ม/ค้นหา/แก้ไข/ลบข้อมูลได้ เชื่อมตารางด้วย JOIN ได้ และเข้าใจตารางที่โปรเจกต์ในคู่มือที่ 3 ใช้
>
> ทดสอบกับ **PostgreSQL 16** (Docker image `postgres:16`) บน Windows 11
>
> แนะนำให้อ่านคู่มือนี้ **ก่อน** [คู่มือที่ 3](03-graph-rag-project.md) เพราะโปรเจกต์เก็บข้อมูลร้านค้าใน PostgreSQL

---

## สารบัญ

1. [PostgreSQL คืออะไร](#1-postgresql-คืออะไร)
2. [ติดตั้งด้วย Docker](#2-ติดตั้งด้วย-docker)
3. [เข้าใช้งาน](#3-เข้าใช้งาน)
4. [คำสั่งของ psql ที่ใช้บ่อย](#4-คำสั่งของ-psql-ที่ใช้บ่อย)
5. [สร้างฐานข้อมูลและตาราง](#5-สร้างฐานข้อมูลและตาราง)
6. [เพิ่มข้อมูล (INSERT)](#6-เพิ่มข้อมูล-insert)
7. [ค้นหาข้อมูล (SELECT)](#7-ค้นหาข้อมูล-select)
8. [สรุปผล (COUNT, SUM, GROUP BY)](#8-สรุปผล-count-sum-group-by)
9. [เชื่อมตาราง (JOIN)](#9-เชื่อมตาราง-join)
10. [แก้ไขและลบ (UPDATE, DELETE)](#10-แก้ไขและลบ-update-delete)
11. [Transaction](#11-transaction)
12. [Index และ EXPLAIN](#12-index-และ-explain)
13. [View](#13-view)
14. [JSONB: เก็บข้อมูลแบบยืดหยุ่น](#14-jsonb-เก็บข้อมูลแบบยืดหยุ่น)
15. [ดูข้อมูลของโปรเจกต์ Graph RAG](#15-ดูข้อมูลของโปรเจกต์-graph-rag)
16. [รันไฟล์ .sql และสำรองข้อมูล](#16-รันไฟล์-sql-และสำรองข้อมูล)
17. [เรียก PostgreSQL จากโค้ด Node.js](#17-เรียก-postgresql-จากโค้ด-nodejs)
18. [คำสั่ง Docker ที่ใช้บ่อย](#18-คำสั่ง-docker-ที่ใช้บ่อย)
19. [ปัญหาที่พบบ่อย](#19-ปัญหาที่พบบ่อย)
20. [แบบฝึกหัด](#20-แบบฝึกหัด)

---

## 1. PostgreSQL คืออะไร

**PostgreSQL** (เรียกสั้นๆ ว่า Postgres) คือฐานข้อมูลแบบ **ตาราง (relational database)** ฟรีและนิยมมาก ใช้ภาษา **SQL** ในการสั่งงาน

```
ตาราง customers                         ตาราง orders
┌────┬────────┬──────────┐              ┌────┬─────────────┐
│ id │ name   │ province │              │ id │ customer_id │ ← foreign key ชี้ไปที่ customers.id
├────┼────────┼──────────┤              ├────┼─────────────┤
│ 1  │ สมชาย  │ กรุงเทพ   │ ◄─────────── │ 1  │ 1           │
│ 2  │ อามิ    │ ปัตตานี    │ ◄─────────── │ 2  │ 2           │
└────┴────────┴──────────┘              └────┴─────────────┘
```

| คำศัพท์ | ความหมาย |
|---|---|
| **Database** | ฐานข้อมูล 1 ก้อน มีได้หลายตาราง |
| **Table** | ตาราง เช่น `customers`, `products` |
| **Row** (แถว) | ข้อมูล 1 รายการ เช่น ลูกค้า 1 คน |
| **Column** (คอลัมน์) | ช่องข้อมูล เช่น `name`, `price` |
| **Primary key** | คอลัมน์ที่ไม่ซ้ำกันเลย ใช้ระบุแถว (มักชื่อ `id`) |
| **Foreign key** | คอลัมน์ที่ชี้ไปยัง primary key ของอีกตาราง เช่น `orders.customer_id` |

### PostgreSQL กับ Neo4j ต่างกันอย่างไร

| | PostgreSQL | Neo4j |
|---|---|---|
| เก็บข้อมูลเป็น | ตาราง | node + เส้นเชื่อม |
| ภาษา | SQL | Cypher |
| เชื่อมข้อมูลด้วย | `JOIN` | เดินตามเส้น `-[:BOUGHT]->` |
| เด่นเรื่อง | ข้อมูลธุรกิจ, ยอดขาย, สต็อก, transaction | ความสัมพันธ์หลายต่อ, ระบบแนะนำ |

> ในโปรเจกต์คู่มือที่ 3 เราใช้ **PostgreSQL เป็นที่เก็บข้อมูลหลัก** (ทั้งข้อมูลร้านค้าและตารางกราฟ) แล้วคัดลอกกราฟไป Neo4j เพื่อดูเป็นภาพ

---

## 2. ติดตั้งด้วย Docker

1. เปิด **Docker Desktop** ให้ขึ้นสถานะ Running (ติดตั้งจาก https://www.docker.com/products/docker-desktop/)
2. สร้างและเปิด PostgreSQL (คำสั่งเดียว บรรทัดเดียว)

   ```bash
   docker run -d --name pg-lab -e POSTGRES_PASSWORD=password123 -p 5435:5432 -v pg-lab-data:/var/lib/postgresql/data postgres:16
   ```

   | ส่วนของคำสั่ง | ความหมาย |
   |---|---|
   | `--name pg-lab` | ตั้งชื่อ container |
   | `-e POSTGRES_PASSWORD=password123` | รหัสผ่านของผู้ใช้ `postgres` (ผู้ดูแลระบบ) |
   | `-p 5435:5432` | พอร์ตเครื่องเรา **5435** → พอร์ตใน container 5432 |
   | `-v pg-lab-data:...` | เก็บข้อมูลไว้ ปิดเครื่องแล้วไม่หาย |
   | `postgres:16` | PostgreSQL เวอร์ชัน 16 |

   > **ทำไมใช้พอร์ต 5435?** พอร์ตมาตรฐานคือ 5432 แต่หลายเครื่องมี PostgreSQL ตัวอื่นใช้อยู่แล้ว และโปรเจกต์ในคู่มือที่ 3 ใช้ 5434 จึงเลือก 5435 ไม่ให้ชนกัน

3. เช็กว่าพร้อมใช้

   ```bash
   docker exec pg-lab pg_isready -U postgres
   ```

   ต้องได้ `accepting connections` (ถ้าได้ `no response` ให้รอ 5-10 วินาทีแล้วลองใหม่)

---

## 3. เข้าใช้งาน

### วิธี A: psql (บรรทัดคำสั่ง มากับ Docker แล้ว)

```bash
docker exec -it pg-lab psql -U postgres
```

จะเห็น prompt แบบนี้ แปลว่าพร้อมพิมพ์คำสั่ง:

```
postgres=#
```

- คำสั่ง SQL **ต้องปิดท้ายด้วย `;`** ถ้าลืม prompt จะเปลี่ยนเป็น `postgres-#` (รอคำสั่งต่อ) ให้พิมพ์ `;` แล้ว Enter
- ออกจาก psql: พิมพ์ `\q`
- ถ้าผลยาวจนขึ้น `(END)` หรือ `--More--` ให้กด `q` เพื่อกลับมาพิมพ์ต่อ

### วิธี B: โปรแกรมแบบมีหน้าจอ (GUI)

ใช้โปรแกรมใดก็ได้: **DBeaver** (https://dbeaver.io), **pgAdmin** (https://www.pgadmin.org) หรือส่วนขยาย **PostgreSQL** ใน VS Code แล้วกรอก

| ช่อง | ค่า |
|---|---|
| Host | `localhost` |
| Port | `5435` |
| Username | `postgres` |
| Password | `password123` |
| Database | `postgres` (หลังข้อ 5 เปลี่ยนเป็น `shop`) |

> **พิมพ์ภาษาไทยแล้วเพี้ยนใน psql?** บางเครื่องส่งภาษาไทยผ่าน Terminal ไม่ถูกต้อง ให้ใช้ GUI หรือเขียนคำสั่งเป็นไฟล์ `.sql` แล้วรันจากไฟล์ (ข้อ 16)

---

## 4. คำสั่งของ psql ที่ใช้บ่อย

คำสั่งที่ขึ้นต้นด้วย `\` เป็นคำสั่งของโปรแกรม psql (ไม่ใช่ SQL) **ไม่ต้องปิดท้ายด้วย `;`**

| คำสั่ง | ใช้ทำอะไร |
|---|---|
| `\l` | ดูรายชื่อฐานข้อมูลทั้งหมด |
| `\c shop` | เปลี่ยนไปใช้ฐานข้อมูล `shop` |
| `\dt` | ดูตารางทั้งหมด |
| `\d products` | ดูโครงสร้างตาราง `products` |
| `\di` | ดู index ทั้งหมด |
| `\dv` | ดู view ทั้งหมด |
| `\du` | ดูผู้ใช้ทั้งหมด |
| `\x` | สลับการแสดงผลแนวตั้ง (ดีเมื่อตารางกว้างมาก) |
| `\timing` | เปิด/ปิดการแสดงเวลาที่ใช้รันคำสั่ง |
| `\i ไฟล์.sql` | รันคำสั่งจากไฟล์ |
| `\?` | ดูคำสั่ง psql ทั้งหมด |
| `\h SELECT` | ดูวิธีเขียนคำสั่ง SQL นั้นๆ |
| `\q` | ออก |

---

## 5. สร้างฐานข้อมูลและตาราง

### 5.1 สร้างฐานข้อมูล

```sql
CREATE DATABASE shop;
```

```
\c shop
```

prompt จะเปลี่ยนเป็น `shop=#`

### 5.2 สร้างตาราง

ระบบร้านค้าเล็กๆ 4 ตาราง:

```
customers ──< orders ──< order_items >── products
 (ลูกค้า)      (คำสั่งซื้อ)   (รายการในคำสั่งซื้อ)    (สินค้า)
```

**ลูกค้า**

```sql
CREATE TABLE customers (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  province   VARCHAR(50)  NOT NULL,
  created_at TIMESTAMPTZ  DEFAULT now()
);
```

**สินค้า**

```sql
CREATE TABLE products (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(200)  NOT NULL UNIQUE,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  stock INT           NOT NULL DEFAULT 0
);
```

**คำสั่งซื้อ**

```sql
CREATE TABLE orders (
  id          SERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

**รายการในคำสั่งซื้อ**

```sql
CREATE TABLE order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id),
  quantity   INT NOT NULL CHECK (quantity > 0),
  price      NUMERIC(10,2) NOT NULL
);
```

**ชนิดข้อมูลที่ใช้บ่อย**

| ชนิด | ใช้เก็บ | ตัวอย่าง |
|---|---|---|
| `SERIAL` | เลขที่เพิ่มเองอัตโนมัติ 1, 2, 3, ... | id |
| `INT` | จำนวนเต็ม | จำนวน, สต็อก |
| `NUMERIC(10,2)` | ทศนิยมแม่นยำ (ทั้งหมด 10 หลัก ทศนิยม 2 หลัก) | ราคา, เงิน |
| `VARCHAR(n)` | ข้อความไม่เกิน n ตัวอักษร | ชื่อ |
| `TEXT` | ข้อความยาวไม่จำกัด | คำอธิบาย, รีวิว |
| `BOOLEAN` | จริง/เท็จ | เปิดขายอยู่ไหม |
| `TIMESTAMPTZ` | วันเวลา (มี timezone) | เวลาสั่งซื้อ |
| `JSONB` | ข้อมูล JSON | คุณสมบัติสินค้า (ข้อ 14) |

**กฎของข้อมูล (constraint)**

| กฎ | ความหมาย |
|---|---|
| `PRIMARY KEY` | ห้ามซ้ำ ห้ามว่าง ใช้ระบุแถว |
| `NOT NULL` | ห้ามว่าง |
| `UNIQUE` | ห้ามซ้ำ |
| `DEFAULT ค่า` | ถ้าไม่ใส่ ให้ใช้ค่านี้ |
| `CHECK (เงื่อนไข)` | ต้องตรงเงื่อนไข เช่น ราคาไม่ติดลบ |
| `REFERENCES ตาราง(คอลัมน์)` | foreign key: ค่าต้องมีอยู่จริงในตารางนั้น |
| `ON DELETE CASCADE` | ลบแถวแม่ แล้วแถวลูกถูกลบตาม (ลบ order → ลบ order_items) |

### 5.3 ตรวจดูตาราง

```
\dt
```

```
            List of relations
 Schema |    Name     | Type  |  Owner
--------+-------------+-------+----------
 public | customers   | table | postgres
 public | order_items | table | postgres
 public | orders      | table | postgres
 public | products    | table | postgres
(4 rows)
```

```
\d products
```

```
                                    Table "public.products"
 Column |          Type          | Collation | Nullable |               Default
--------+------------------------+-----------+----------+--------------------------------------
 id     | integer                |           | not null | nextval('products_id_seq'::regclass)
 name   | character varying(200) |           | not null |
 price  | numeric(10,2)          |           | not null |
 stock  | integer                |           | not null | 0
Indexes:
    "products_pkey" PRIMARY KEY, btree (id)
    "products_name_key" UNIQUE CONSTRAINT, btree (name)
Check constraints:
    "products_price_check" CHECK (price >= 0::numeric)
```

---

## 6. เพิ่มข้อมูล (INSERT)

> **ข้อความใน SQL ใช้เครื่องหมาย `'` (single quote)** เช่น `'สมชาย'` ต่างจาก Cypher ที่ใช้ `"`
> ถ้าใช้ `"` ใน SQL จะหมายถึง **ชื่อคอลัมน์/ตาราง** และจะ error

**เพิ่มทีละแถว** (ไม่ต้องใส่ `id` เพราะ `SERIAL` สร้างให้เอง)

```sql
INSERT INTO customers (name, province) VALUES ('สมชาย', 'กรุงเทพ');
```

**เพิ่มหลายแถวในคำสั่งเดียว**

```sql
INSERT INTO customers (name, province) VALUES ('อามิ', 'ปัตตานี'), ('วิภา', 'กรุงเทพ');
```

```sql
INSERT INTO products (name, price, stock) VALUES ('หูฟัง', 1290, 25), ('ลำโพง', 990, 40), ('กระติกน้ำ', 590, 50);
```

**คำสั่งซื้อ** (ลูกค้า id 1, 2, 3 สั่งคนละ 1 ครั้ง)

```sql
INSERT INTO orders (customer_id) VALUES (1), (2), (3);
```

**รายการสินค้าในแต่ละคำสั่งซื้อ**

```sql
INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
  (1, 1, 1, 1290),
  (1, 3, 2, 590),
  (2, 1, 1, 1290),
  (2, 2, 1, 990),
  (3, 2, 3, 990);
```

ความหมาย: สมชายซื้อหูฟัง 1 + กระติกน้ำ 2, อามิซื้อหูฟัง 1 + ลำโพง 1, วิภาซื้อลำโพง 3
(ข้อมูลชุดเดียวกับ [คู่มือ Neo4j](02-neo4j-basics.md) จะได้เทียบ SQL กับ Cypher ได้)

---

## 7. ค้นหาข้อมูล (SELECT)

รูปแบบ: `SELECT คอลัมน์ FROM ตาราง WHERE เงื่อนไข ORDER BY การเรียง LIMIT จำนวน;`

**ดูทุกคอลัมน์ทุกแถว**

```sql
SELECT * FROM customers;
```

| id | name | province | created_at |
|---|---|---|---|
| 1 | สมชาย | กรุงเทพ | 2026-11-06 15:33:57+00 |
| 2 | อามิ | ปัตตานี | 2026-11-06 15:33:57+00 |
| 3 | วิภา | กรุงเทพ | 2026-11-06 15:33:57+00 |

> ใน psql คอลัมน์ภาษาไทยอาจดูเยื้องกัน เป็นแค่การแสดงผล ข้อมูลไม่ผิด

**เลือกบางคอลัมน์**

```sql
SELECT id, name, province FROM customers;
```

**กรองและเรียง**

```sql
SELECT name, price FROM products WHERE price < 1000 ORDER BY price;
```

| name | price |
|---|---|
| กระติกน้ำ | 590.00 |
| ลำโพง | 990.00 |

**ค้นหาด้วยบางส่วนของข้อความ** (`%` = อะไรก็ได้, ใช้ `ILIKE` ถ้าไม่สนตัวพิมพ์เล็ก-ใหญ่)

```sql
SELECT name FROM products WHERE name LIKE '%หู%';
```

| name |
|---|
| หูฟัง |

**ช่วงของค่า**

```sql
SELECT name, price FROM products WHERE price BETWEEN 500 AND 1000;
```

**ค่าที่อยู่ในรายการ**

```sql
SELECT name FROM customers WHERE province IN ('กรุงเทพ', 'สงขลา');
```

| name |
|---|
| สมชาย |
| วิภา |

**แพงที่สุด 2 อันดับ**

```sql
SELECT name, price FROM products ORDER BY price DESC LIMIT 2;
```

| name | price |
|---|---|
| หูฟัง | 1290.00 |
| ลำโพง | 990.00 |

**ตัวดำเนินการที่ใช้บ่อยใน WHERE**

| ตัวดำเนินการ | ตัวอย่าง |
|---|---|
| `=`, `<>` (ไม่เท่ากับ), `<`, `>`, `<=`, `>=` | `price >= 500` |
| `AND`, `OR`, `NOT` | `price > 500 AND stock > 0` |
| `LIKE`, `ILIKE` | `name LIKE 'หู%'` |
| `IN (...)` | `province IN ('กรุงเทพ', 'สงขลา')` |
| `BETWEEN a AND b` | `price BETWEEN 500 AND 1000` |
| `IS NULL`, `IS NOT NULL` | `phone IS NULL` |

---

## 8. สรุปผล (COUNT, SUM, GROUP BY)

**นับจำนวน**

```sql
SELECT count(*) AS customers FROM customers;
```

| customers |
|---|
| 3 |

**ค่าต่ำสุด สูงสุด เฉลี่ย ผลรวม**

```sql
SELECT min(price), max(price), round(avg(price), 2) AS avg_price, sum(stock) AS total_stock FROM products;
```

| min | max | avg_price | total_stock |
|---|---|---|---|
| 590.00 | 1290.00 | 956.67 | 115 |

**จัดกลุ่มด้วย GROUP BY: ลูกค้าแต่ละจังหวัดมีกี่คน**

```sql
SELECT province, count(*) AS customers FROM customers GROUP BY province ORDER BY customers DESC;
```

| province | customers |
|---|---|
| กรุงเทพ | 2 |
| ปัตตานี | 1 |

> `AS ชื่อ` = ตั้งชื่อเล่นให้คอลัมน์ผลลัพธ์

---

## 9. เชื่อมตาราง (JOIN)

ข้อมูล "ใครซื้ออะไร" กระจายอยู่ 4 ตาราง ต้องใช้ `JOIN` เชื่อมผ่าน foreign key

```
customers.id = orders.customer_id
orders.id    = order_items.order_id
products.id  = order_items.product_id
```

**ใครซื้ออะไร** (`c`, `o`, `i`, `p` คือชื่อย่อของตาราง)

```sql
SELECT c.name AS customer, p.name AS product, i.quantity
FROM customers c
JOIN orders o      ON o.customer_id = c.id
JOIN order_items i ON i.order_id = o.id
JOIN products p    ON p.id = i.product_id
ORDER BY c.id, p.id;
```

| customer | product | quantity |
|---|---|---|
| สมชาย | หูฟัง | 1 |
| สมชาย | กระติกน้ำ | 2 |
| อามิ | หูฟัง | 1 |
| อามิ | ลำโพง | 1 |
| วิภา | ลำโพง | 3 |

**ลูกค้าในกรุงเทพซื้ออะไร** (เพิ่ม WHERE)

```sql
SELECT c.name AS customer, p.name AS product
FROM customers c
JOIN orders o      ON o.customer_id = c.id
JOIN order_items i ON i.order_id = o.id
JOIN products p    ON p.id = i.product_id
WHERE c.province = 'กรุงเทพ'
ORDER BY c.id, p.id;
```

| customer | product |
|---|---|
| สมชาย | หูฟัง |
| สมชาย | กระติกน้ำ |
| วิภา | ลำโพง |

เทียบกับ Cypher ใน [คู่มือที่ 2](02-neo4j-basics.md) ที่ได้ผลเหมือนกัน:

```cypher
MATCH (c:City {name: "กรุงเทพ"})<-[:LIVES_IN]-(p:Person)-[:BOUGHT]->(prod:Product) RETURN p.name, prod.name
```

**ยอดซื้อแต่ละคน** (JOIN + GROUP BY)

```sql
SELECT c.name, sum(i.quantity) AS items, sum(i.quantity * i.price) AS total
FROM customers c
JOIN orders o      ON o.customer_id = c.id
JOIN order_items i ON i.order_id = o.id
GROUP BY c.name
ORDER BY total DESC;
```

| name | items | total |
|---|---|---|
| วิภา | 3 | 2970.00 |
| สมชาย | 3 | 2470.00 |
| อามิ | 2 | 2280.00 |

**กรองผลรวมด้วย HAVING** (`WHERE` กรองก่อนจัดกลุ่ม, `HAVING` กรองหลังจัดกลุ่ม)

```sql
SELECT c.name, sum(i.quantity * i.price) AS total
FROM customers c
JOIN orders o      ON o.customer_id = c.id
JOIN order_items i ON i.order_id = o.id
GROUP BY c.name
HAVING sum(i.quantity * i.price) > 2400
ORDER BY total DESC;
```

| name | total |
|---|---|
| วิภา | 2970.00 |
| สมชาย | 2470.00 |

**LEFT JOIN: หาสินค้าที่ยังไม่มีใครซื้อ**

`JOIN` ธรรมดาเอาเฉพาะแถวที่จับคู่ได้ ส่วน `LEFT JOIN` เอาทุกแถวของตารางซ้าย ถ้าจับคู่ไม่ได้ ฝั่งขวาจะเป็น `NULL`

```sql
INSERT INTO products (name, price, stock) VALUES ('พัดลม', 450, 60);
```

```sql
SELECT p.name
FROM products p
LEFT JOIN order_items i ON i.product_id = p.id
WHERE i.id IS NULL;
```

| name |
|---|
| พัดลม |

---

## 10. แก้ไขและลบ (UPDATE, DELETE)

> **ระวัง:** `UPDATE` และ `DELETE` ที่ไม่มี `WHERE` จะทำกับ **ทุกแถว** ในตาราง

**แก้ไข** (`RETURNING` = แสดงแถวที่ถูกแก้)

```sql
UPDATE products SET price = 1190 WHERE name = 'หูฟัง' RETURNING id, name, price;
```

| id | name | price |
|---|---|---|
| 1 | หูฟัง | 1190.00 |

**แก้ไขโดยคำนวณจากค่าเดิม**

```sql
UPDATE products SET stock = stock - 1 WHERE id = 2 RETURNING name, stock;
```

| name | stock |
|---|---|
| ลำโพง | 39 |

**ลบ**

```sql
DELETE FROM products WHERE name = 'พัดลม' RETURNING name;
```

### กฎของข้อมูลช่วยกันข้อมูลผิด

ลองรันทีละคำสั่ง ทุกคำสั่ง **ต้อง error** (ซึ่งเป็นสิ่งที่ถูกต้อง)

**ลบลูกค้าที่ยังมีคำสั่งซื้ออยู่** → foreign key ไม่ยอม

```sql
DELETE FROM customers WHERE name = 'สมชาย';
```

```
ERROR:  update or delete on table "customers" violates foreign key constraint "orders_customer_id_fkey" on table "orders"
DETAIL:  Key (id)=(1) is still referenced from table "orders".
```

**สินค้าชื่อซ้ำ** → `UNIQUE` ไม่ยอม

```sql
INSERT INTO products (name, price) VALUES ('ลำโพง', 500);
```

```
ERROR:  duplicate key value violates unique constraint "products_name_key"
```

**ราคาติดลบ** → `CHECK` ไม่ยอม

```sql
INSERT INTO products (name, price) VALUES ('ของแถม', -10);
```

```
ERROR:  new row for relation "products" violates check constraint "products_price_check"
```

---

## 11. Transaction

**Transaction** = รวมหลายคำสั่งเป็นชุดเดียว **สำเร็จทั้งหมด หรือไม่เกิดอะไรเลย**

| คำสั่ง | ความหมาย |
|---|---|
| `BEGIN;` | เริ่ม transaction |
| `COMMIT;` | ยืนยัน บันทึกทั้งหมด |
| `ROLLBACK;` | ยกเลิก ย้อนกลับทั้งหมด |

### ลองยกเลิกด้วย ROLLBACK

รันทีละคำสั่ง:

```sql
BEGIN;
```

```sql
UPDATE products SET stock = 0 WHERE name = 'หูฟัง';
```

```sql
SELECT name, stock FROM products WHERE name = 'หูฟัง';
```

ได้ `stock = 0`

```sql
ROLLBACK;
```

```sql
SELECT name, stock FROM products WHERE name = 'หูฟัง';
```

ได้ `stock = 25` เหมือนเดิม เพราะยกเลิกไปแล้ว

### สร้างคำสั่งซื้อจริงด้วย COMMIT

วิภาสั่งกระติกน้ำ 1 ใบ: ต้องสร้าง order + เพิ่มรายการ + ตัดสต็อก ถ้าทำไม่ครบทั้ง 3 อย่างข้อมูลจะผิด จึงต้องใช้ transaction

```sql
BEGIN;
INSERT INTO orders (customer_id) VALUES (3) RETURNING id;
INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (currval('orders_id_seq'), 3, 1, 590);
UPDATE products SET stock = stock - 1 WHERE id = 3;
COMMIT;
```

> `currval('orders_id_seq')` = id ของ order ที่เพิ่งสร้างในคำสั่งก่อนหน้า ไม่ต้องจำเลขเอง

```sql
SELECT name, stock FROM products ORDER BY id;
```

| name | stock |
|---|---|
| หูฟัง | 25 |
| ลำโพง | 39 |
| กระติกน้ำ | 49 |

> ถ้าคำสั่งใดใน transaction error จะขึ้น `current transaction is aborted` ให้พิมพ์ `ROLLBACK;` แล้วเริ่มใหม่
>
> API `POST /api/orders` ในคู่มือที่ 3 ก็ใช้ transaction แบบเดียวกันนี้ (ผ่าน TypeORM)

---

## 12. Index และ EXPLAIN

**Index** ทำให้ค้นหาเร็วขึ้น เหมือนสารบัญท้ายหนังสือ (PostgreSQL สร้างให้ primary key และ `UNIQUE` อัตโนมัติ)

```sql
CREATE INDEX idx_customers_province ON customers (province);
```

```
\di
```

**EXPLAIN** ดูว่าฐานข้อมูลจะค้นหาอย่างไร

```sql
EXPLAIN SELECT * FROM customers WHERE province = 'กรุงเทพ';
```

```
 Seq Scan on customers  (cost=0.00..1.04 rows=1 width=348)
   Filter: ((province)::text = 'กรุงเทพ'::text)
```

- `Seq Scan` = อ่านทุกแถว, `Index Scan` = ใช้ index
- ตารางเล็กแบบนี้ PostgreSQL เลือกอ่านทุกแถวเพราะเร็วกว่า เมื่อข้อมูลเป็นหมื่นแถวขึ้นไปจะเริ่มใช้ index เอง
- ควรสร้าง index ให้คอลัมน์ที่ใช้ใน `WHERE` และ `JOIN` บ่อยๆ

---

## 13. View

**View** = เก็บคำสั่ง SELECT ไว้ใช้ซ้ำเหมือนเป็นตาราง

```sql
CREATE VIEW sales_by_customer AS
SELECT c.name, c.province, sum(i.quantity * i.price) AS total
FROM customers c
JOIN orders o      ON o.customer_id = c.id
JOIN order_items i ON i.order_id = o.id
GROUP BY c.name, c.province;
```

```sql
SELECT * FROM sales_by_customer ORDER BY total DESC;
```

| name | province | total |
|---|---|---|
| วิภา | กรุงเทพ | 3560.00 |
| สมชาย | กรุงเทพ | 2470.00 |
| อามิ | ปัตตานี | 2280.00 |

> ยอดของวิภาเพิ่มจาก 2970 เป็น 3560 เพราะคำสั่งซื้อกระติกน้ำในข้อ 11 view คำนวณใหม่ทุกครั้งที่เรียก

---

## 14. JSONB: เก็บข้อมูลแบบยืดหยุ่น

ใช้เมื่อแต่ละแถวมีข้อมูลไม่เหมือนกัน เช่น หูฟังมีสี ลำโพงไม่มี

```sql
ALTER TABLE products ADD COLUMN attributes JSONB NOT NULL DEFAULT '{}';
```

```sql
UPDATE products SET attributes = '{"brand": "SoundGo", "waterproof": true, "colors": ["ดำ", "ขาว"]}' WHERE name = 'หูฟัง';
```

```sql
UPDATE products SET attributes = '{"brand": "SoundGo", "waterproof": true}' WHERE name = 'ลำโพง';
```

**อ่านค่าออกมา** (`->>` = ได้เป็นข้อความ, `->` = ได้เป็น JSON)

```sql
SELECT name, attributes ->> 'brand' AS brand FROM products;
```

| name | brand |
|---|---|
| กระติกน้ำ | |
| หูฟัง | SoundGo |
| ลำโพง | SoundGo |

**ค้นหาสินค้าที่ JSON มีค่าตรงกัน** (`@>` = "มีส่วนนี้อยู่")

```sql
SELECT name FROM products WHERE attributes @> '{"waterproof": true}';
```

| name |
|---|
| หูฟัง |
| ลำโพง |

**มี key นี้ไหม** (`?`) และอ่านค่าในอาร์เรย์

```sql
SELECT name, attributes -> 'colors' ->> 0 AS first_color FROM products WHERE attributes ? 'colors';
```

| name | first_color |
|---|---|
| หูฟัง | ดำ |

> โปรเจกต์ในคู่มือที่ 3 ใช้ JSONB เก็บ `properties` ของ node และเส้นในกราฟ

---

## 15. ดูข้อมูลของโปรเจกต์ Graph RAG

> ต้องเปิดโปรเจกต์ในคู่มือที่ 3 และเรียก `POST /api/seed` กับ `POST /api/graph/build` แล้ว

เข้า PostgreSQL ของโปรเจกต์ (ผู้ใช้ `shop`, ฐานข้อมูล `shop`):

```bash
docker exec -it rag-graph-postgres psql -U shop -d shop
```

```
\dt
```

```
 public | categories  | table | shop
 public | customers   | table | shop
 public | graph_edges | table | shop    ← เส้นของกราฟ
 public | graph_nodes | table | shop    ← node ของกราฟ
 public | order_items | table | shop
 public | orders      | table | shop
 public | products    | table | shop
 public | reviews     | table | shop
```

**node แต่ละชนิดมีกี่ตัว**

```sql
SELECT type, count(*) FROM graph_nodes GROUP BY type ORDER BY count DESC;
```

| type | count |
|---|---|
| Product | 8 |
| Customer | 5 |
| Category | 3 |
| Province | 3 |

**ใครเชื่อมกับ node "กรุงเทพ"** (JOIN ตารางกราฟกับตัวเอง 2 รอบ)

```sql
SELECT s.name AS source, e.relation, t.name AS target
FROM graph_edges e
JOIN graph_nodes s ON s.id = e.source_id
JOIN graph_nodes t ON t.id = e.target_id
WHERE t.name = 'กรุงเทพ';
```

| source | relation | target |
|---|---|---|
| สมชาย ใจดี | LIVES_IN | กรุงเทพ |
| ฟาริด หะยีมะ | LIVES_IN | กรุงเทพ |
| นภัส ทองคำ | LIVES_IN | กรุงเทพ |

**เดินกราฟ 2 ก้าวด้วย `WITH RECURSIVE`** (สิ่งที่ `expandSubgraph` ในโปรเจกต์ทำ)

```sql
WITH RECURSIVE walk(node_id, depth) AS (
  SELECT id, 0 FROM graph_nodes WHERE name = 'กรุงเทพ'
  UNION
  SELECT CASE WHEN e.source_id = w.node_id THEN e.target_id ELSE e.source_id END, w.depth + 1
  FROM walk w
  JOIN graph_edges e ON e.source_id = w.node_id OR e.target_id = w.node_id
  WHERE w.depth < 2
)
SELECT n.type, n.name, min(w.depth) AS depth
FROM walk w JOIN graph_nodes n ON n.id = w.node_id
GROUP BY n.type, n.name
ORDER BY depth, n.type, n.name;
```

| type | name | depth |
|---|---|---|
| Province | กรุงเทพ | 0 |
| Customer | นภัส ทองคำ | 1 |
| Customer | ฟาริด หะยีมะ | 1 |
| Customer | สมชาย ใจดี | 1 |
| Product | กระติกน้ำเก็บอุณหภูมิ HydroKeep 1L | 2 |
| Product | รองเท้าวิ่ง SpeedRun Pro | 2 |
| Product | สมาร์ทวอทช์ FitPulse 3 | 2 |
| Product | หูฟังบลูทูธ SoundGo X1 | 2 |

อ่านแบบนี้:

- ส่วนแรก (ก่อน `UNION`) = จุดเริ่มต้น
- ส่วนที่สอง = จากทุก node ที่เจอแล้ว เดินไปหาเพื่อนบ้านอีก 1 ก้าว
- ทำซ้ำจนครบ `depth < 2`

**อ่านค่าจาก JSONB ของ node**

```sql
SELECT name, properties ->> 'price' AS price
FROM graph_nodes
WHERE type = 'Product' AND (properties ->> 'price')::numeric < 1000;
```

| name | price |
|---|---|
| ลำโพงพกพา SoundGo Mini | 990 |
| พัดลมพกพาไร้สาย CoolBreeze | 450 |
| กระติกน้ำเก็บอุณหภูมิ HydroKeep 1L | 590 |

> `::numeric` = แปลงชนิดข้อมูล (ค่าที่อ่านจาก `->>` เป็นข้อความ ต้องแปลงเป็นตัวเลขก่อนเทียบ)

---

## 16. รันไฟล์ .sql และสำรองข้อมูล

### รันคำสั่งจากไฟล์

เหมาะกับคำสั่งยาวๆ หรือมีภาษาไทยเยอะ

1. สร้างไฟล์ `test.sql` ใน VS Code (บันทึกเป็น UTF-8 อยู่แล้ว)

   ```sql
   INSERT INTO customers (name, province) VALUES ('ทดสอบ', 'สงขลา');
   SELECT name, province FROM customers WHERE name = 'ทดสอบ';
   ```

2. รัน (PowerShell และ Command Prompt)

   ```bash
   cmd /c "docker exec -i pg-lab psql -U postgres -d shop < test.sql"
   ```

   Git Bash / Mac / Linux:

   ```bash
   docker exec -i pg-lab psql -U postgres -d shop < test.sql
   ```

### สำรองข้อมูล (backup)

```bash
cmd /c "docker exec pg-lab pg_dump -U postgres shop > shop-backup.sql"
```

ได้ไฟล์ `shop-backup.sql` ที่มีทั้งโครงสร้างตารางและข้อมูล

> บน PowerShell **ให้ครอบด้วย `cmd /c "..."`** เพราะ `>` ของ PowerShell แปลงข้อความก่อนบันทึก ขึ้นกับการตั้งค่าเครื่อง (Windows PowerShell 5.1 ปกติบันทึกเป็น UTF-16) ไฟล์อาจนำกลับเข้า PostgreSQL ไม่ได้หรือภาษาไทยเพี้ยน ส่วน `cmd /c` บันทึกตามที่ได้รับมาตรงๆ ทุกเครื่อง

### นำข้อมูลกลับ (restore) ลงฐานข้อมูลใหม่

```bash
docker exec pg-lab createdb -U postgres shop_copy
```

```bash
cmd /c "docker exec -i pg-lab psql -U postgres -d shop_copy < shop-backup.sql"
```

ตรวจ:

```bash
docker exec pg-lab psql -U postgres -d shop_copy -c "SELECT count(*) FROM customers;"
```

---

## 17. เรียก PostgreSQL จากโค้ด Node.js

```bash
npm install pg
```

ไฟล์ `pg-test.mjs`:

```js
import pg from "pg";

const pool = new pg.Pool({
  host: "localhost",
  port: 5435,
  user: "postgres",
  password: "password123",
  database: "shop",
});

// ส่งค่าผ่าน $1, $2 ... เสมอ ห้ามต่อ string เอง (กัน SQL injection)
const { rows } = await pool.query(
  `SELECT c.name AS customer, p.name AS product
     FROM customers c
     JOIN orders o      ON o.customer_id = c.id
     JOIN order_items i ON i.order_id = o.id
     JOIN products p    ON p.id = i.product_id
    WHERE c.province = $1`,
  ["กรุงเทพ"],
);

for (const r of rows) {
  console.log(r.customer, "ซื้อ", r.product);
}

await pool.end();
```

```bash
node pg-test.mjs
```

```
สมชาย ซื้อ หูฟัง
สมชาย ซื้อ กระติกน้ำ
วิภา ซื้อ ลำโพง
วิภา ซื้อ กระติกน้ำ
```

### เขียน SQL เอง เทียบกับใช้ TypeORM (คู่มือที่ 3)

| เขียน SQL เอง (`pg`) | TypeORM |
|---|---|
| `CREATE TABLE products (...)` | `@Entity("products") class Product { ... }` |
| `SELECT * FROM products ORDER BY id` | `repo.find({ order: { id: "ASC" } })` |
| `INSERT INTO products (...) VALUES (...)` | `repo.save({ name, price })` |
| `BEGIN ... COMMIT` | `db.transaction(async (m) => { ... })` |
| ควบคุมได้ทุกอย่าง | เขียนน้อยกว่า ได้ type ของ TypeScript |

โปรเจกต์ในคู่มือที่ 3 ใช้ทั้งสองแบบ: งานทั่วไปใช้ TypeORM ส่วนคำสั่งพิเศษอย่าง `WITH RECURSIVE` เขียน SQL เองผ่าน `db.query(...)`

---

## 18. คำสั่ง Docker ที่ใช้บ่อย

| ต้องการ | คำสั่ง |
|---|---|
| ดู container ที่รันอยู่ | `docker ps` |
| หยุด | `docker stop pg-lab` |
| เปิดอีกครั้ง | `docker start pg-lab` |
| ดู log | `docker logs pg-lab` |
| ลบ container (ข้อมูลยังอยู่) | `docker rm -f pg-lab` |
| ลบข้อมูลทั้งหมดด้วย | `docker volume rm pg-lab-data` |

---

## 19. ปัญหาที่พบบ่อย

| อาการ | วิธีแก้ |
|---|---|
| `failed to connect to the docker API` | ยังไม่ได้เปิด Docker Desktop |
| `Bind for 0.0.0.0:5435 failed: port is already allocated` | พอร์ตถูกใช้ เปลี่ยน `-p 5435:5432` เป็นเลขอื่น เช่น `-p 5436:5432` |
| `password authentication failed` | รหัสผ่านผิด ถ้าลืมให้ลบ container และ volume แล้วสร้างใหม่ (ข้อ 18) |
| `database "shop" does not exist` | ยังไม่ได้ `CREATE DATABASE shop;` |
| `relation "customers" does not exist` | อยู่ผิดฐานข้อมูล พิมพ์ `\c shop` ก่อน |
| `column "สมชาย" does not exist` | ใช้ `"` กับข้อความ ต้องใช้ `'สมชาย'` |
| พิมพ์คำสั่งแล้ว Enter ไม่มีอะไรเกิดขึ้น | ลืม `;` ท้ายคำสั่ง พิมพ์ `;` แล้ว Enter |
| ขึ้น `(END)` ค้างอยู่ | กด `q` |
| `current transaction is aborted` | มี error ใน transaction พิมพ์ `ROLLBACK;` |
| `violates foreign key constraint` | กำลังลบข้อมูลที่ตารางอื่นยังอ้างถึง ให้ลบแถวลูกก่อน หรือใช้ `ON DELETE CASCADE` |
| ภาษาไทยเพี้ยนใน psql | ใช้ GUI หรือรันจากไฟล์ `.sql` (ข้อ 16) |
| restore แล้ว error ตั้งแต่บรรทัดแรก หรือภาษาไทยเพี้ยน | ไฟล์ backup อาจถูกสร้างด้วย `>` ของ PowerShell ให้สร้างใหม่ด้วย `cmd /c` (ข้อ 16) |
| restore แล้วขึ้น `relation "..." already exists` | กำลัง restore ลงฐานข้อมูลที่มีตารางอยู่แล้ว ให้สร้างฐานข้อมูลใหม่ด้วย `createdb` ก่อน |

---

## 20. แบบฝึกหัด

ใช้ข้อมูลจากข้อ 5-11

1. เพิ่มลูกค้า "ฟาริด" จังหวัดสงขลา
2. หาสินค้าที่ราคามากกว่า 1,000 บาท
3. หายอดขายรวมของแต่ละจังหวัด เรียงจากมากไปน้อย
4. หาว่าสินค้าแต่ละชิ้นขายได้กี่ชิ้น (สินค้าที่ขายไม่ได้ให้แสดง 0)
5. เพิ่มคอลัมน์ `phone` ให้ตาราง customers แล้วใส่เบอร์ให้สมชาย

<details>
<summary>เฉลย</summary>

```sql
-- 1
INSERT INTO customers (name, province) VALUES ('ฟาริด', 'สงขลา');
```

```sql
-- 2
SELECT name, price FROM products WHERE price > 1000;
```

```sql
-- 3
SELECT c.province, sum(i.quantity * i.price) AS sales
FROM customers c
JOIN orders o      ON o.customer_id = c.id
JOIN order_items i ON i.order_id = o.id
GROUP BY c.province
ORDER BY sales DESC;
```

```sql
-- 4 (COALESCE = ถ้าเป็น NULL ให้ใช้ค่า 0 แทน)
SELECT p.name, COALESCE(sum(i.quantity), 0) AS sold
FROM products p
LEFT JOIN order_items i ON i.product_id = p.id
GROUP BY p.name
ORDER BY sold DESC;
```

```sql
-- 5
ALTER TABLE customers ADD COLUMN phone VARCHAR(20);
UPDATE customers SET phone = '081-234-5678' WHERE name = 'สมชาย';
SELECT name, phone FROM customers ORDER BY id;
```

</details>

---

**ดูเพิ่ม:** [คู่มือที่ 1: Next.js](01-nextjs-basics.md) · [คู่มือที่ 2: Neo4j](02-neo4j-basics.md) · [คู่มือที่ 3: โปรเจกต์ Graph RAG](03-graph-rag-project.md)
