// POST /api/rag/ask : ถามคำถามด้วย Graph RAG
// body: { "question": "...", "hops": 2 }
import { handle, readJson, requireFields } from "@/lib/http";
import { askGraph } from "@/lib/graph/ask";

export const maxDuration = 120;

export const POST = handle(async (req: Request) => {
  const body = await readJson<{ question: string; hops?: number }>(req);
  requireFields(body, ["question"]);
  return askGraph(String(body.question), { hops: body.hops });
});
