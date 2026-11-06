import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ไม่ให้ Next.js bundle TypeORM กับ pg (TypeORM มี require แบบ dynamic สำหรับ driver หลายตัว)
  serverExternalPackages: ["typeorm", "pg", "neo4j-driver"],
};

export default nextConfig;
