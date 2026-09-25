import { AgentCompare } from "@/lib/agent/AgentCompare";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Plain JSON twin of the MCP compare_ticker tool. 400 for a malformed ticker instead of a silent default. */
export async function GET(_request: Request, context: { params: Promise<{ ticker: string }> }) {
  const { ticker: raw } = await context.params;
  const parsed = AgentCompare.parseTicker(raw);
  const headers = { "cache-control": "no-store", "access-control-allow-origin": "*" };
  if (!parsed.ok) {
    return Response.json({ error: "bad_ticker", message: parsed.error }, { status: 400, headers });
  }
  return Response.json(await AgentCompare.compare(parsed.ticker), { headers });
}
