import { describe, expect, it } from "vitest";
import { McpServer } from "@/lib/agent/McpServer";
import type { TickerComparison } from "@/lib/agent/AgentCompare";

const fakeCompare = async (ticker: string) =>
  ({ ticker, status: "ok", marker: "from-board" }) as unknown as TickerComparison;

const server = new McpServer({ compare: fakeCompare });

describe("McpServer", () => {
  it("answers initialize with tools capability and echoes a supported protocol version", async () => {
    const res = await server.handle({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "t", version: "0" } },
    });
    expect(res).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: { protocolVersion: "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "xstocklens" } },
    });
  });

  it("falls back to its latest protocol version for an unknown one", async () => {
    const res = await server.handle({ jsonrpc: "2.0", id: 2, method: "initialize", params: { protocolVersion: "1999-01-01" } });
    expect((res as { result: { protocolVersion: string } }).result.protocolVersion).toBe(McpServer.PROTOCOL_VERSIONS[0]);
  });

  it("returns no response for notifications", async () => {
    expect(await server.handle({ jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull();
  });

  it("lists exactly the two read-only tools with input schemas", async () => {
    const res = (await server.handle({ jsonrpc: "2.0", id: 3, method: "tools/list" })) as {
      result: { tools: Array<{ name: string; inputSchema: { type: string }; annotations: { readOnlyHint: boolean } }> };
    };
    expect(res.result.tools.map((t) => t.name)).toEqual(["compare_ticker", "list_supported_tickers"]);
    expect(res.result.tools.every((t) => t.inputSchema.type === "object" && t.annotations.readOnlyHint)).toBe(true);
  });

  it("calls compare_ticker and returns the comparison as structured content and JSON text", async () => {
    const res = (await server.handle({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "compare_ticker", arguments: { ticker: "tsla" } },
    })) as { result: { isError: boolean; structuredContent: Record<string, unknown>; content: Array<{ type: string; text: string }> } };
    expect(res.result.isError).toBe(false);
    expect(res.result.structuredContent).toMatchObject({ ticker: "TSLA", marker: "from-board" });
    expect(JSON.parse(res.result.content[0].text)).toMatchObject({ ticker: "TSLA" });
  });

  it("reports a malformed ticker as a tool error, not a silent default", async () => {
    const res = (await server.handle({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "compare_ticker", arguments: { ticker: "!!!" } },
    })) as { result: { isError: boolean; content: Array<{ text: string }> } };
    expect(res.result.isError).toBe(true);
    expect(res.result.content[0].text).toMatch(/1-6 letters/);
  });

  it("returns the curated ticker list", async () => {
    const res = (await server.handle({
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: { name: "list_supported_tickers", arguments: {} },
    })) as { result: { structuredContent: { tickers: unknown[] } } };
    expect(res.result.structuredContent.tickers).toHaveLength(12);
  });

  it("uses JSON-RPC errors for unknown tools, unknown methods and bad requests", async () => {
    const tool = (await server.handle({ jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "buy_stock" } })) as {
      error: { code: number };
    };
    expect(tool.error.code).toBe(-32602);
    const method = (await server.handle({ jsonrpc: "2.0", id: 8, method: "resources/list" })) as { error: { code: number } };
    expect(method.error.code).toBe(-32601);
    const bad = (await server.handle({ nope: true })) as { id: null; error: { code: number } };
    expect(bad).toMatchObject({ id: null, error: { code: -32600 } });
  });

  it("answers ping", async () => {
    expect(await server.handle({ jsonrpc: "2.0", id: 9, method: "ping" })).toEqual({ jsonrpc: "2.0", id: 9, result: {} });
  });
});
