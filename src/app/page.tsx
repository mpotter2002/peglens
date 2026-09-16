import { BoardComposer } from "@/lib/board/BoardComposer";
import { TickerUniverse } from "@/lib/catalog/TickerUniverse";
import { PriceBoard } from "@/components/PriceBoard";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const params = await searchParams;
  const ticker = TickerUniverse.normalize(params.t);
  const board = await BoardComposer.compose(ticker);
  return <PriceBoard initial={board} />;
}
