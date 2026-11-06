"use client"; // ทำงานในเบราว์เซอร์ จึงใช้ useState, useEffect และรับการคลิกได้

import { useEffect, useState } from "react";
import Link from "next/link";

type Category = { id: number; name: string };
type Product = { id: number; name: string; price: number; stock: number; category?: Category };

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState("");

  // โหลดสินค้าจาก API (ข้อมูลมาจาก PostgreSQL)
  async function load() {
    const res = await fetch("/api/products");
    setProducts(await res.json());
  }

  useEffect(() => {
    load();
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data: Category[]) => {
        setCategories(data);
        if (data.length) setCategoryId(String(data[0].id));
      });
  }, []);

  // ส่งฟอร์มไปที่ API แล้วโหลดรายการใหม่
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price: Number(price), categoryId: Number(categoryId), stock: 10 }),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "เพิ่มสินค้าไม่สำเร็จ");
      return;
    }
    setName("");
    setPrice("");
    load();
  }

  return (
    <div className="mt-6">
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <input
          className="border rounded px-2 py-1 bg-white"
          placeholder="ชื่อสินค้า"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="border rounded px-2 py-1 w-28 bg-white"
          placeholder="ราคา"
          type="number"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
        <select
          className="border rounded px-2 py-1 bg-white"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="bg-blue-600 text-white rounded px-4 py-1">เพิ่ม</button>
      </form>
      {error && <p className="mt-2 text-red-600">{error}</p>}

      {products.length === 0 && (
        <p className="mt-6 text-slate-500">
          ยังไม่มีสินค้า ใส่ข้อมูลตัวอย่างด้วย <code>POST /api/seed</code>
        </p>
      )}

      <ul className="mt-6 space-y-2">
        {products.map((p) => (
          <li key={p.id} className="bg-white border rounded-lg p-3 flex flex-wrap justify-between gap-2">
            <Link href={`/products/${p.id}`} className="text-blue-600 underline">
              {p.name}
            </Link>
            <span className="text-slate-600">
              {p.category?.name} · {p.price.toLocaleString()} บาท · เหลือ {p.stock} ชิ้น
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
