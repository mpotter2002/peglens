import { DemoHost } from "@/lib/demo/DemoHost";
import { HermesClient } from "@/lib/pyth/HermesClient";
import { TickerUniverse } from "@/lib/catalog/TickerUniverse";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    ok: true,
    service: "xstocklens",
    demo: true,
    defaultTicker: TickerUniverse.DEFAULT,
    pythKeyConfigured: Boolean(HermesClient.apiKey()),
    host: DemoHost.snapshot(),
  });
}
