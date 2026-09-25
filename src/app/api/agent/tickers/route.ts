import { AgentCompare } from "@/lib/agent/AgentCompare";

export const dynamic = "force-static";

/** Plain JSON twin of the MCP list_supported_tickers tool. */
export function GET() {
  return Response.json(AgentCompare.tickers(), { headers: { "access-control-allow-origin": "*" } });
}
