import { BoardComposer } from "@/lib/board/BoardComposer";
import { TickerUniverse } from "@/lib/catalog/TickerUniverse";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET(
  _request: Request,
  context: { params: Promise<{ ticker: string }> },
) {
  const { ticker: raw } = await context.params;
  const ticker = TickerUniverse.normalize(raw);
  try {
    const board = await BoardComposer.compose(ticker);
    return Response.json(board, {
      headers: {
        "cache-control": "no-store",
      },
    });
  } catch {
    return Response.json(BoardComposer.unavailable(ticker), {
      headers: {
        "cache-control": "no-store",
      },
    });
  }
}
