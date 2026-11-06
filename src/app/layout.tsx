// กรอบหลักของทุกหน้า: <html>, <body>, แถบเมนูด้านบน
import type { Metadata } from "next";
import Link from "next/link";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

// ฟอนต์ภาษาไทยจาก Google Fonts (Next.js ดาวน์โหลดและเก็บไว้ในโปรเจกต์ให้เอง)
const font = Noto_Sans_Thai({ subsets: ["thai", "latin"] });

export const metadata: Metadata = {
  title: "ร้านค้า Graph RAG",
  description: "ร้านค้าตัวอย่างสำหรับเรียน Next.js, PostgreSQL, Neo4j และ Graph RAG",
};

const menu = [
  { href: "/", label: "หน้าแรก" },
  { href: "/products", label: "สินค้า" },
  { href: "/ask", label: "ถามคำถาม" },
  { href: "/about", label: "เกี่ยวกับเรา" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={`${font.className} min-h-screen`}>
        <header className="bg-white border-b">
          <nav className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/" className="font-bold text-lg text-blue-700">
              🛒 ร้านค้า Graph RAG
            </Link>
            {menu.map((m) => (
              <Link key={m.href} href={m.href} className="text-slate-600 hover:text-blue-700">
                {m.label}
              </Link>
            ))}
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
