import { McpServer, type JsonRpcResponse } from "@/lib/agent/McpServer";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Remote MCP endpoint (Streamable HTTP, stateless, JSON responses).
 * POST a JSON-RPC message or batch; GET returns 405 because this server
 * never opens a server-to-client SSE stream.
 */

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, GET, OPTIONS",
  "access-control-allow-headers": "content-type, accept, mcp-protocol-version, mcp-session-id",
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error: body is not JSON." } }, 400);
  }
  const server = new McpServer();
  if (Array.isArray(body)) {
    const replies = (await Promise.all(body.map((message) => server.handle(message)))).filter(
      (reply): reply is JsonRpcResponse => reply !== null,
    );
    return replies.length ? json(replies) : new Response(null, { status: 202, headers: CORS });
  }
  const reply = await server.handle(body);
  return reply ? json(reply) : new Response(null, { status: 202, headers: CORS });
}

export function GET() {
  return new Response("This MCP server is stateless and has no SSE stream. POST JSON-RPC to this URL.", {
    status: 405,
    headers: { ...CORS, allow: "POST, OPTIONS" },
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

function json(payload: unknown, status = 200) {
  return Response.json(payload, { status, headers: { ...CORS, "cache-control": "no-store" } });
}
