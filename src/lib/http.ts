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
