# คู่มือที่ 1: Next.js เบื้องต้น (ติดตั้ง สร้างหน้าเว็บ และสร้าง API)

> เป้าหมาย: เมื่อจบคู่มือนี้ ผู้เรียนจะติดตั้ง Next.js ได้ สร้างหน้าเว็บได้หลายหน้า สร้าง API ได้ และให้หน้าเว็บเรียก API ได้
>
> ทดสอบกับ **Next.js 16.4**, Node.js 24, Windows 11

---

## สารบัญ

1. [Next.js คืออะไร](#1-nextjs-คืออะไร)
2. [เตรียมเครื่อง](#2-เตรียมเครื่อง)
3. [สร้างโปรเจกต์](#3-สร้างโปรเจกต์)
4. [รู้จักโครงสร้างโปรเจกต์](#4-รู้จักโครงสร้างโปรเจกต์)
5. [กฎสำคัญ: โฟลเดอร์ = URL](#5-กฎสำคัญ-โฟลเดอร์--url)
6. [สร้างหน้าเว็บ](#6-สร้างหน้าเว็บ)
7. [สร้าง API](#7-สร้าง-api)
8. [ทดสอบ API](#8-ทดสอบ-api)
9. [ให้หน้าเว็บเรียก API (ฟอร์มเพิ่มสินค้า)](#9-ให้หน้าเว็บเรียก-api-ฟอร์มเพิ่มสินค้า)
10. [หน้าแบบมีตัวแปรใน URL](#10-หน้าแบบมีตัวแปรใน-url)
11. [Build สำหรับใช้งานจริง](#11-build-สำหรับใช้งานจริง)
12. [ปัญหาที่พบบ่อย](#12-ปัญหาที่พบบ่อย)
13. [แบบฝึกหัด](#13-แบบฝึกหัด)

---

## 1. Next.js คืออะไร

**Next.js** คือ framework สำหรับสร้างเว็บด้วย React ที่ทำได้ทั้ง **หน้าเว็บ (frontend)** และ **API (backend)** ในโปรเจกต์เดียว

```
เบราว์เซอร์ ──► http://localhost:3000/products      ──► หน้าเว็บ (page.tsx)
            ──► http://localhost:3000/api/products  ──► API ส่ง JSON กลับ (route.ts)
```

| คำศัพท์ | ความหมาย |
|---|---|
| **App Router** | ระบบกำหนด URL ด้วยโฟลเดอร์ใน `src/app` (แบบใหม่ ใช้ในคู่มือนี้) |
| **Page** | ไฟล์ `page.tsx` = 1 หน้าเว็บ |
| **Route Handler** | ไฟล์ `route.ts` = 1 API |
| **Server Component** | component ที่ทำงานบนเซิร์ฟเวอร์ (ค่าเริ่มต้น) |
| **Client Component** | component ที่ทำงานในเบราว์เซอร์ ต้องเขียน `"use client"` บรรทัดแรก ใช้เมื่อต้องรับการคลิก/พิมพ์ |

---

## 2. เตรียมเครื่อง

| โปรแกรม | ใช้ทำอะไร | ดาวน์โหลด |
|---|---|---|
| **Node.js** (LTS, เวอร์ชัน 20.9 ขึ้นไป) | รัน JavaScript และติดตั้ง package | https://nodejs.org |
| **VS Code** | เขียนโค้ด | https://code.visualstudio.com |
| ส่วนขยาย **REST Client** ใน VS Code | ทดสอบ API (ไม่บังคับ แต่แนะนำ) | ค้นหาใน Extensions ของ VS Code |

เช็กว่าติดตั้ง Node.js แล้ว (เปิด Terminal หรือ PowerShell):

```bash
node -v
```

```bash
npm -v
```

ถ้าขึ้นเลขเวอร์ชัน เช่น `v24.x.x` แปลว่าพร้อมแล้ว

---

## 3. สร้างโปรเจกต์

### 3.1 สั่งสร้าง

ไปยังโฟลเดอร์ที่จะเก็บงาน แล้วรัน:

```bash
npx create-next-app@latest my-shop --ts --app --src-dir --tailwind --eslint --import-alias "@/*" --use-npm
```

ความหมายของแต่ละตัวเลือก:

| ตัวเลือก | ความหมาย |
|---|---|
| `my-shop` | ชื่อโฟลเดอร์โปรเจกต์ |
| `--ts` | ใช้ TypeScript |
| `--app` | ใช้ App Router |
| `--src-dir` | เก็บโค้ดในโฟลเดอร์ `src/` |
| `--tailwind` | ใช้ Tailwind CSS (เขียน style ผ่าน `className`) |
| `--eslint` | ตัวช่วยตรวจโค้ด |
| `--import-alias "@/*"` | import ไฟล์ด้วย `@/` แทน `../../` |
| `--use-npm` | ใช้ npm ติดตั้ง package |

> ถ้าอยากตอบคำถามเอง ให้รันแค่ `npx create-next-app@latest my-shop` แล้วเลือกตามตารางด้านบน

รอจนเห็นข้อความ `Success! Created my-shop at ...`

> **ถ้าขึ้น `npm install has failed`** ให้เข้าโฟลเดอร์แล้วสั่ง `npm install` อีกครั้ง (มักเกิดจากเน็ตหลุดหรือ Windows ล็อกไฟล์ชั่วคราว)

### 3.2 เข้าโฟลเดอร์และเปิด VS Code

```bash
cd my-shop
```

```bash
code .
```

### 3.3 รันโปรเจกต์

```bash
npm run dev
```

เปิดเบราว์เซอร์ไปที่ **http://localhost:3000** จะเห็นหน้าเริ่มต้นของ Next.js

- แก้ไฟล์แล้วกดบันทึก หน้าเว็บจะอัปเดตเอง ไม่ต้องรันใหม่
- หยุดเซิร์ฟเวอร์: กด `Ctrl + C` ใน Terminal

---

## 4. รู้จักโครงสร้างโปรเจกต์

```
my-shop/
├── public/               ← ไฟล์รูป/ไอคอน เปิดได้ตรงๆ เช่น /next.svg
├── src/
│   └── app/
│       ├── layout.tsx    ← กรอบหลักของทุกหน้า (<html>, <body>)
│       ├── page.tsx      ← หน้าแรก  →  /
│       ├── globals.css   ← CSS ที่ใช้ทั้งเว็บ
│       └── favicon.ico
├── next.config.ts        ← ตั้งค่า Next.js
├── package.json          ← รายชื่อ package และคำสั่ง (npm run ...)
├── tsconfig.json         ← ตั้งค่า TypeScript
└── node_modules/         ← package ที่ติดตั้ง (ห้ามแก้ ห้ามส่งขึ้น git)
```

คำสั่งใน `package.json`:

| คำสั่ง | ใช้ทำอะไร |
|---|---|
| `npm run dev` | รันตอนพัฒนา (แก้แล้วเห็นผลทันที) |
| `npm run build` | สร้างไฟล์สำหรับใช้งานจริง |
| `npm run start` | รันไฟล์ที่ build แล้ว |

---

## 5. กฎสำคัญ: โฟลเดอร์ = URL

ใน `src/app` **ชื่อโฟลเดอร์คือ URL** และ **ชื่อไฟล์บอกว่าเป็นหน้าเว็บหรือ API**

| ไฟล์ | URL | ชนิด |
|---|---|---|
| `src/app/page.tsx` | `/` | หน้าเว็บ |
| `src/app/about/page.tsx` | `/about` | หน้าเว็บ |
| `src/app/products/page.tsx` | `/products` | หน้าเว็บ |
| `src/app/products/[id]/page.tsx` | `/products/1`, `/products/2`, ... | หน้าเว็บ (มีตัวแปร) |
| `src/app/api/hello/route.ts` | `/api/hello` | API |
| `src/app/api/products/route.ts` | `/api/products` | API |
| `src/app/api/products/[id]/route.ts` | `/api/products/1`, ... | API (มีตัวแปร) |

- `page.tsx` กับ `route.ts` **อยู่โฟลเดอร์เดียวกันไม่ได้**
- โฟลเดอร์ชื่อ `[id]` (มีวงเล็บเหลี่ยม) = ส่วนของ URL ที่เปลี่ยนได้

สิ่งที่จะสร้างในคู่มือนี้:

```
src/
├── app/
│   ├── page.tsx                  ← หน้าแรก (แก้ไฟล์เดิม)
│   ├── about/page.tsx            ← หน้าเกี่ยวกับเรา
│   ├── products/page.tsx         ← หน้ารายการสินค้า + ฟอร์ม
│   ├── products/[id]/page.tsx    ← หน้ารายละเอียดสินค้า
│   └── api/
│       ├── hello/route.ts        ← API ทดสอบ
│       ├── products/route.ts     ← API ดู/เพิ่มสินค้า
│       └── products/[id]/route.ts← API ดูสินค้าตาม id
├── components/ProductList.tsx    ← ฟอร์ม + รายการสินค้า (ทำงานในเบราว์เซอร์)
└── lib/products.ts               ← ข้อมูลสินค้า
```

> **วิธีสร้างไฟล์ใน VS Code:** คลิกขวาที่โฟลเดอร์ `src/app` → New File → พิมพ์ `about/page.tsx` (ใส่ `/` แล้ว VS Code สร้างโฟลเดอร์ให้เอง)
>
> **โฟลเดอร์ `[id]`:** พิมพ์ชื่อพร้อมวงเล็บเหลี่ยมได้เลย เช่น `products/[id]/page.tsx`

---

## 6. สร้างหน้าเว็บ

### 6.1 แก้หน้าแรก

เปิด `src/app/page.tsx` ลบของเดิมทั้งหมด แล้ววางโค้ดนี้:

```tsx
// หน้าแรก http://localhost:3000
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">ร้านค้าของฉัน</h1>
      <p className="mt-4">ยินดีต้อนรับสู่ร้านค้าตัวอย่าง</p>
      <nav className="mt-6 flex gap-4">
        <Link href="/products" className="text-blue-600 underline">ดูสินค้า</Link>
        <Link href="/about" className="text-blue-600 underline">เกี่ยวกับเรา</Link>
      </nav>
    </main>
  );
}
```

บันทึกแล้วดูที่ http://localhost:3000

- หน้าเว็บ 1 หน้า = function ที่ `export default` และ return HTML (JSX)
- ใช้ `<Link>` แทน `<a>` เพื่อให้เปลี่ยนหน้าได้เร็วโดยไม่โหลดใหม่ทั้งหน้า
- `className` คือ class ของ Tailwind เช่น `p-8` = padding, `text-3xl` = ตัวใหญ่, `font-bold` = ตัวหนา

### 6.2 สร้างหน้า "เกี่ยวกับเรา"

สร้างไฟล์ `src/app/about/page.tsx`

```tsx
// หน้า http://localhost:3000/about
export default function AboutPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">เกี่ยวกับร้านของเรา</h1>
      <p className="mt-4">ร้านขายของออนไลน์ตัวอย่าง สร้างด้วย Next.js</p>
    </main>
  );
}
```

เปิด http://localhost:3000/about

> **ลองเอง:** แก้ชื่อร้านใน `src/app/layout.tsx` ตรง `title: "Create Next App"` เป็นชื่อร้านของเรา แล้วดูชื่อบนแท็บเบราว์เซอร์

---

## 7. สร้าง API

### 7.1 API แรก

สร้างไฟล์ `src/app/api/hello/route.ts`

```ts
// GET http://localhost:3000/api/hello
export async function GET() {
  return Response.json({ message: "สวัสดีจาก API" });
}
```

เปิด http://localhost:3000/api/hello จะเห็น

```json
{"message":"สวัสดีจาก API"}
```

- ชื่อ function = HTTP method: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- `Response.json(ข้อมูล)` = ส่ง JSON กลับ

### 7.2 ที่เก็บข้อมูลสินค้า

ยังไม่ใช้ฐานข้อมูล เก็บข้อมูลไว้ในหน่วยความจำก่อน (ปิดเซิร์ฟเวอร์แล้วข้อมูลที่เพิ่มจะหาย)

สร้างไฟล์ `src/lib/products.ts`

```ts
// ข้อมูลสินค้าตัวอย่าง (เก็บในหน่วยความจำ ปิดเซิร์ฟเวอร์แล้วจะหาย)
// งานจริงจะเก็บในฐานข้อมูลแทน
export type Product = {
  id: number;
  name: string;
  price: number;
};

// เก็บไว้ใน globalThis เพื่อให้หน้าเว็บและ API ใช้ข้อมูลชุดเดียวกัน
// (Next.js แยกโค้ดของหน้าเว็บกับ API ออกจากกัน ถ้าใช้ตัวแปรธรรมดาจะได้คนละชุด)
const store = globalThis as unknown as { products?: Product[] };

const products: Product[] = (store.products ??= [
  { id: 1, name: "หูฟังบลูทูธ", price: 1290 },
  { id: 2, name: "ลำโพงพกพา", price: 990 },
  { id: 3, name: "กระติกน้ำเก็บความเย็น", price: 590 },
]);

export function getProducts() {
  return products;
}

export function getProduct(id: number) {
  return products.find((p) => p.id === id);
}

export function addProduct(name: string, price: number) {
  const id = Math.max(0, ...products.map((p) => p.id)) + 1;
  const product = { id, name, price };
  products.push(product);
  return product;
}
```

### 7.3 API ดูและเพิ่มสินค้า

สร้างไฟล์ `src/app/api/products/route.ts`

```ts
import { addProduct, getProducts } from "@/lib/products";

// GET /api/products : ดูสินค้าทั้งหมด
export async function GET() {
  return Response.json(getProducts());
}

// POST /api/products : เพิ่มสินค้า  body: { "name": "...", "price": 100 }
export async function POST(request: Request) {
  const body = await request.json();

  if (!body.name || typeof body.price !== "number") {
    return Response.json({ error: "ต้องมี name และ price (ตัวเลข)" }, { status: 400 });
  }

  const product = addProduct(body.name, body.price);
  return Response.json(product, { status: 201 });
}
```

- `request.json()` = อ่าน body ที่ส่งมา
- `{ status: 400 }` = ส่งรหัสบอกว่าข้อมูลผิด, `201` = สร้างสำเร็จ

### 7.4 API ดูสินค้าตาม id

สร้างไฟล์ `src/app/api/products/[id]/route.ts`

```ts
import { getProduct } from "@/lib/products";

// GET /api/products/1 : ดูสินค้าตาม id
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const product = getProduct(Number(id));

  if (!product) {
    return Response.json({ error: "ไม่พบสินค้า" }, { status: 404 });
  }
  return Response.json(product);
}
```

- ค่า `[id]` ใน URL อ่านได้จาก `params` (ต้อง `await` ก่อนใช้)
- ค่าที่ได้เป็นข้อความเสมอ จึงแปลงด้วย `Number(id)`

---

## 8. ทดสอบ API

### วิธีที่ 1: เบราว์เซอร์ (ใช้ได้แค่ GET)

- http://localhost:3000/api/products
- http://localhost:3000/api/products/1
- http://localhost:3000/api/products/99 → `{"error":"ไม่พบสินค้า"}`

### วิธีที่ 2: REST Client ใน VS Code (แนะนำ)

สร้างไฟล์ `test.http` ที่โฟลเดอร์นอกสุดของโปรเจกต์:

```http
### ดูสินค้าทั้งหมด
GET http://localhost:3000/api/products

### ดูสินค้า id 1
GET http://localhost:3000/api/products/1

### เพิ่มสินค้า
POST http://localhost:3000/api/products
Content-Type: application/json

{ "name": "เต็นท์ 2 คน", "price": 2190 }

### ส่งข้อมูลไม่ครบ (ต้องได้ error 400)
POST http://localhost:3000/api/products
Content-Type: application/json

{ "name": "ไม่มีราคา" }
```

กด **Send Request** ที่อยู่เหนือแต่ละ request ผลจะแสดงทางขวา

### วิธีที่ 3: curl ใน Terminal

GET:

```bash
curl.exe http://localhost:3000/api/products
```

> บน Windows PowerShell ต้องพิมพ์ `curl.exe` (ถ้าพิมพ์แค่ `curl` จะไปเรียกคำสั่งอื่นของ PowerShell) ส่วน Mac/Linux ใช้ `curl`

POST: **ถ้าข้อมูลเป็นภาษาไทย ให้เขียน JSON ไว้ในไฟล์** เพราะ Windows จะแปลงภาษาไทยที่พิมพ์ในบรรทัดคำสั่งเป็น `??????`

1. สร้างไฟล์ `product.json` ใน VS Code (VS Code บันทึกเป็น UTF-8 ให้อยู่แล้ว)

   ```json
   { "name": "เต็นท์ 2 คน", "price": 2190 }
   ```

2. ส่งไฟล์นั้นด้วยคำสั่ง

   ```bash
   curl.exe -X POST http://localhost:3000/api/products -H "Content-Type: application/json" --data-binary "@product.json"
   ```

ผลที่ได้:

```json
{"id":4,"name":"เต็นท์ 2 คน","price":2190}
```

---

## 9. ให้หน้าเว็บเรียก API (ฟอร์มเพิ่มสินค้า)

หน้าเว็บที่ต้อง **รับการพิมพ์/คลิก** ต้องเป็น **Client Component** (เขียน `"use client"` บรรทัดแรก)

### 9.1 สร้าง component ฟอร์ม + รายการสินค้า

สร้างไฟล์ `src/components/ProductList.tsx`

```tsx
"use client"; // ทำงานในเบราว์เซอร์ จึงใช้ useState, useEffect และรับการคลิกได้

import { useEffect, useState } from "react";
import Link from "next/link";

type Product = { id: number; name: string; price: number };

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  // โหลดสินค้าจาก API
  async function load() {
    const res = await fetch("/api/products");
    setProducts(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  // ส่งฟอร์มไปที่ API แล้วโหลดรายการใหม่
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price: Number(price) }),
    });
    setName("");
    setPrice("");
    load();
  }

  return (
    <div className="mt-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="border rounded px-2 py-1"
          placeholder="ชื่อสินค้า"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="border rounded px-2 py-1 w-28"
          placeholder="ราคา"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
        <button className="bg-blue-600 text-white rounded px-4 py-1">เพิ่ม</button>
      </form>

      <ul className="mt-6 space-y-2">
        {products.map((p) => (
          <li key={p.id} className="border rounded p-3">
            <Link href={`/products/${p.id}`} className="text-blue-600 underline">
              {p.name}
            </Link>{" "}
            - {p.price.toLocaleString()} บาท
          </li>
        ))}
      </ul>
    </div>
  );
}
```

| ส่วนของโค้ด | ทำอะไร |
|---|---|
| `useState` | เก็บค่าที่เปลี่ยนได้ (รายการสินค้า, ค่าในช่อง input) |
| `useEffect(..., [])` | ทำครั้งเดียวตอนเปิดหน้า: โหลดสินค้า |
| `fetch("/api/products")` | เรียก API ที่สร้างไว้ในข้อ 7 |
| `onSubmit` | เมื่อกดปุ่ม "เพิ่ม" ส่งข้อมูลไป `POST /api/products` |

### 9.2 สร้างหน้าสินค้า

สร้างไฟล์ `src/app/products/page.tsx`

```tsx
// หน้า http://localhost:3000/products
import ProductList from "@/components/ProductList";

export default function ProductsPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">สินค้าทั้งหมด</h1>
      <ProductList />
    </main>
  );
}
```

เปิด http://localhost:3000/products แล้วลองพิมพ์ชื่อสินค้ากับราคา กด **เพิ่ม** สินค้าใหม่จะขึ้นในรายการทันที

---

## 10. หน้าแบบมีตัวแปรใน URL

สร้างไฟล์ `src/app/products/[id]/page.tsx`

```tsx
// หน้า http://localhost:3000/products/1  ([id] คือส่วนที่เปลี่ยนได้ของ URL)
import Link from "next/link";
import { Suspense } from "react";
import { getProduct } from "@/lib/products";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="p-8">
      <Link href="/products" className="text-blue-600 underline">
        ← กลับไปหน้าสินค้า
      </Link>
      {/* ค่า id มาจาก URL ตอนเปิดหน้า จึงต้องห่อด้วย Suspense */}
      <Suspense fallback={<p className="mt-4">กำลังโหลด...</p>}>
        <ProductDetail params={params} />
      </Suspense>
    </main>
  );
}

async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProduct(Number(id));

  if (!product) {
    return <p className="mt-4">ไม่พบสินค้า</p>;
  }

  return (
    <div className="mt-4">
      <h1 className="text-2xl font-bold">{product.name}</h1>
      <p className="mt-2">ราคา {product.price.toLocaleString()} บาท</p>
    </div>
  );
}
```

ลองกดชื่อสินค้าในหน้า `/products` หรือเปิด http://localhost:3000/products/2

**ทำไมต้องใช้ `Suspense`?**
Next.js 16 เปิดตัวเลือก `cacheComponents` ไว้ (ดูใน `next.config.ts`) ทำให้ส่วนที่คงที่ของหน้า (หัวเรื่อง, ลิงก์กลับ) ถูกสร้างไว้ล่วงหน้า ส่วนที่ต้องรู้ค่าจาก URL ก่อนจึงจะแสดงได้ ต้องห่อด้วย `<Suspense>` และกำหนดสิ่งที่จะแสดงระหว่างรอ (`fallback`)

> ถ้าลืมห่อ ตอน `npm run build` จะขึ้น error:
> `Route "/products/[id]": Next.js encountered uncached or runtime data during prerendering.`

**สรุป Server Component กับ Client Component**

| | Server Component (ค่าเริ่มต้น) | Client Component (`"use client"`) |
|---|---|---|
| ทำงานที่ | เซิร์ฟเวอร์ | เบราว์เซอร์ |
| อ่านข้อมูล/ฐานข้อมูลตรงๆ | ได้ | ไม่ได้ ต้องเรียก API |
| `useState`, `onClick`, `onChange` | ไม่ได้ | ได้ |
| ตัวอย่างในคู่มือนี้ | `products/[id]/page.tsx` | `ProductList.tsx` |

---

## 11. Build สำหรับใช้งานจริง

หยุด `npm run dev` ก่อน (`Ctrl + C`) แล้วรัน:

```bash
npm run build
```

ถ้าผ่านจะเห็นตารางสรุปหน้าเว็บทั้งหมด:

```
Route (app)
┌ ○ /
├ ○ /about
├ ○ /api/hello
├ ƒ /api/products
├ ƒ /api/products/[id]
├ ○ /products
└   /products/[id]
  └ ◐ /products/[id]

○  (Static)             สร้างไว้ล่วงหน้า
◐  (Partial Prerender)  สร้างไว้บางส่วน อีกส่วนสร้างตอนเปิดหน้า
ƒ  (Dynamic)            สร้างใหม่ทุกครั้งที่มีคนเรียก
```

รันแบบใช้งานจริง:

```bash
npm run start
```

เปิด http://localhost:3000 เหมือนเดิม

---

## 12. ปัญหาที่พบบ่อย

| อาการ | วิธีแก้ |
|---|---|
| `npm install has failed` ตอนสร้างโปรเจกต์ | `cd my-shop` แล้วสั่ง `npm install` อีกครั้ง |
| `Turbopack is not supported on this platform ... native bindings` หรือ `is not a valid Win32 application` | ไฟล์ติดตั้งเสียจากการโหลดไม่ครบ ลบโฟลเดอร์ `node_modules` แล้วสั่ง `npm install` ใหม่ |
| `Port 3000 is in use` | ปิดโปรแกรมที่ใช้พอร์ตอยู่ หรือรันพอร์ตอื่น: `npm run dev -- -p 3001` |
| ภาษาไทยกลายเป็น `??????` ตอนใช้ curl | เขียน JSON ไว้ในไฟล์แล้วใช้ `--data-binary "@ไฟล์.json"` หรือใช้ REST Client (ข้อ 8) |
| ใช้ `curl -X POST` ใน PowerShell แล้ว error | พิมพ์ `curl.exe` แทน `curl` |
| `encountered uncached or runtime data during prerendering` ตอน build | ห่อส่วนที่ `await params` ด้วย `<Suspense>` (ข้อ 10) |
| สินค้าที่เพิ่มหายไป | ปกติ เพราะเก็บในหน่วยความจำ รีสตาร์ตแล้วหาย (คู่มือที่ 3 จะใช้ฐานข้อมูลจริง) |
| `useState` ใช้ไม่ได้ / error เรื่อง hooks | ลืมใส่ `"use client";` บรรทัดแรกของไฟล์ |
| แก้โค้ดแล้วหน้าเว็บไม่เปลี่ยน | กดบันทึกไฟล์หรือยัง? ลองรีเฟรช หรือหยุดแล้ว `npm run dev` ใหม่ |

---

## 13. แบบฝึกหัด

1. สร้างหน้า `/contact` แสดงที่อยู่และเบอร์โทรร้าน
2. เพิ่มลิงก์ "ติดต่อเรา" ในหน้าแรก
3. เพิ่ม field `stock` (จำนวนคงเหลือ) ให้สินค้า แล้วแสดงในหน้ารายละเอียด
4. สร้าง API `DELETE /api/products/[id]` สำหรับลบสินค้า แล้วเพิ่มปุ่ม "ลบ" ใน `ProductList`
5. ทำให้ `POST /api/products` ตอบ error 400 ถ้าราคาติดลบ

**คำใบ้ข้อ 4:** ใน `src/lib/products.ts` เพิ่ม

```ts
export function deleteProduct(id: number) {
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return false;
  products.splice(index, 1);
  return true;
}
```

แล้วใน `src/app/api/products/[id]/route.ts` เพิ่ม function ชื่อ `DELETE` ที่เรียก `deleteProduct`

---

**ต่อไป:** [คู่มือที่ 2: Neo4j เบื้องต้น](02-neo4j-basics.md)
