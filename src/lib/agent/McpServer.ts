import { AgentCompare, type TickerComparison } from "@/lib/agent/AgentCompare";

/**
 * Minimal Model Context Protocol server (JSON-RPC 2.0) for the Streamable HTTP
 * transport in stateless JSON-response mode: one POST in, one JSON body out.
 * Tools only, both read-only. No SDK dependency: the surface is small and fully tested.
 */

type JsonRpcId = string | number | null;
type JsonRpcRequest = { jsonrpc: "2.0"; id?: JsonRpcId; method: string; params?: Record<string, unknown> };
export type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: JsonRpcId; result: unknown }
  | { jsonrpc: "2.0"; id: JsonRpcId; error: { code: number; message: string } };

const TOOLS = [
  {
    name: "compare_ticker",
    title: "Compare a US stock with its tokenized wrappers",
    description:
      "Compare the US cash (broker) mark for one ticker with its tokenized wrappers on Solana: the xStock (e.g. AAPLx) and the Ondo token (e.g. AAPLon). Returns each price with its Pyth source and freshness, the wrapper premium/discount vs cash in % and $, wrapper identity (Solana mint, decimals, name source), the US session (a closed session means the cash price is a last cash print, not a live quote), the xStock redemption rate, and indicative $100 USDC venue quotes from Raydium, Jupiter and Meteora with whether they are comparable. Missing data is null with a reason, never estimated. Read-only: no trading or signing. Not investment advice.",
    inputSchema: {
      type: "object",
      properties: {
        ticker: { type: "string", description: "US ticker, 1-6 letters, e.g. AAPL, TSLA, SPY.", pattern: "^[A-Za-z]{1,6}$" },
      },
      required: ["ticker"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: "list_supported_tickers",
    title: "List the curated tickers",
    description:
      "List the 12 curated desk tickers with names, the Pyth cash feed symbol, and the xStock and Ondo wrapper symbols. compare_ticker also accepts other US tickers; those without feeds or mints return nulls with reasons.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
] as const;

export class McpServer {
  static readonly PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"] as const;
  static readonly INSTRUCTIONS =
    "xStockLens compares ordinary US stock prices with their tokenized versions on Solana (xStocks and Ondo). Call list_supported_tickers to see the curated set, then compare_ticker for one ticker. Treat null as missing data. A closed session means the cash price is a last print. Venue quotes are indicative, never fills. Read-only; not investment advice.";

  private readonly compare: (ticker: string) => Promise<TickerComparison>;

  constructor(deps: { compare?: (ticker: string) => Promise<TickerComparison> } = {}) {
    this.compare = deps.compare ?? ((ticker) => AgentCompare.compare(ticker));
  }

  static tools() {
    return TOOLS;
  }

  /** Handles one JSON-RPC message. Returns null for notifications (no response body). */
  async handle(message: unknown): Promise<JsonRpcResponse | null> {
    if (!this.isRequest(message)) {
      return this.error(null, -32600, "Invalid Request: expected a JSON-RPC 2.0 object with a string method.");
    }
    if (message.id === undefined) {
      return null;
    }
    const id = message.id;
    switch (message.method) {
      case "initialize":
        return this.ok(id, this.initialize(message.params));
      case "ping":
        return this.ok(id, {});
      case "tools/list":
        return this.ok(id, { tools: TOOLS });
      case "tools/call":
        return this.callTool(id, message.params);
      default:
        return this.error(id, -32601, `Method not found: ${message.method}`);
    }
  }

  private initialize(params: Record<string, unknown> | undefined) {
    const asked = typeof params?.protocolVersion === "string" ? params.protocolVersion : null;
    const protocolVersion = (McpServer.PROTOCOL_VERSIONS as readonly string[]).includes(asked ?? "")
      ? (asked as string)
      : McpServer.PROTOCOL_VERSIONS[0];
    return {
      protocolVersion,
      capabilities: { tools: {} },
      serverInfo: { name: "xstocklens", title: "xStockLens", version: "0.1.0" },
      instructions: McpServer.INSTRUCTIONS,
    };
  }

  private async callTool(id: JsonRpcId, params: Record<string, unknown> | undefined): Promise<JsonRpcResponse> {
    const name = params?.name;
    const args = (params?.arguments ?? {}) as Record<string, unknown>;
    if (name === "list_supported_tickers") {
      return this.ok(id, this.toolResult(AgentCompare.tickers()));
    }
    if (name === "compare_ticker") {
      const parsed = AgentCompare.parseTicker(args.ticker);
      if (!parsed.ok) {
        return this.ok(id, { content: [{ type: "text", text: parsed.error }], isError: true });
      }
      try {
        return this.ok(id, this.toolResult(await this.compare(parsed.ticker)));
      } catch {
        return this.ok(id, {
          content: [{ type: "text", text: `Could not build a comparison for ${parsed.ticker} right now. No data was invented; try again.` }],
          isError: true,
        });
      }
    }
    return this.error(id, -32602, `Unknown tool: ${String(name)}. Available: compare_ticker, list_supported_tickers.`);
  }

  private toolResult(data: object) {
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: data,
      isError: false,
    };
  }

  private isRequest(message: unknown): message is JsonRpcRequest {
    return (
      typeof message === "object" &&
      message !== null &&
      (message as { jsonrpc?: unknown }).jsonrpc === "2.0" &&
      typeof (message as { method?: unknown }).method === "string"
    );
  }

  private ok(id: JsonRpcId, result: unknown): JsonRpcResponse {
    return { jsonrpc: "2.0", id, result };
  }

  private error(id: JsonRpcId, code: number, message: string): JsonRpcResponse {
    return { jsonrpc: "2.0", id, error: { code, message } };
  }
}
