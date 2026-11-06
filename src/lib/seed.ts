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
