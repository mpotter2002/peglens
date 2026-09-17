import { HomeBoard } from "@/components/HomeBoard";
import { PriceBoard } from "@/components/PriceBoard";
import { TickerUniverse } from "@/lib/catalog/TickerUniverse";
import { DemoHost } from "@/lib/demo/DemoHost";
import { SessionClock } from "@/lib/market/SessionClock";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const params = await searchParams;
  const ticker = TickerUniverse.fromSearchParam(params.t);
  if (!ticker) {
    return <HomeBoard host={DemoHost.snapshot()} session={SessionClock.snapshot()} />;
  }
  return <PriceBoard ticker={ticker} />;
}
