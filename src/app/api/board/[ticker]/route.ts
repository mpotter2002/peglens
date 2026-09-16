import { BoardComposer } from "@/lib/board/BoardComposer";
import { TickerUniverse } from "@/lib/catalog/TickerUniverse";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await context.params;
  const board = await BoardComposer.compose(TickerUniverse.normalize(ticker));
  return Response.json(board, {
    headers: {
      "cache-control": "no-store",
    },
  });
}
