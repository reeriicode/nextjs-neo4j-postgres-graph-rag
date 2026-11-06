import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ไม่ให้ Next.js bundle TypeORM กับ pg (TypeORM มี require แบบ dynamic สำหรับ driver หลายตัว)
  serverExternalPackages: ["typeorm", "pg", "neo4j-driver"],

  // ให้ Turbopack แปลงไฟล์ CSS ด้วย Tailwind (ตั้งค่าแบบเดียวกับที่ create-next-app สร้างในคู่มือที่ 1)
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
