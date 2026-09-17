export type DemoStep = {
  n: string;
  title: string;
  lookFor: string;
};

export class DemoScript {
  static readonly DEFAULT_TICKER = "AAPL";

  static steps(): DemoStep[] {
    return [
      {
        n: "01",
        title: "Land on popular list",
        lookFor: "Home is the ticker list. Desk is a drill-in. No wallet, no fill.",
      },
      {
        n: "02",
        title: "Read three marks",
        lookFor: "Cash · xStock · Ondo from Pyth. Em dashes are empty, not estimates.",
      },
      {
        n: "03",
        title: "Session badge",
        lookFor: "After hours / weekend → Last cash print on the cash column.",
      },
      {
        n: "04",
        title: "Cheapest honest route",
        lookFor: "Cheapest venue is the primary CTA. Raydium, Jupiter, and Meteora are listed. AAPLon says so if Raydium has no pool.",
      },
      {
        n: "05",
        title: "Switch ticker",
        lookFor: "Search or tap a popular ticker. Unknown names stay empty.",
      },
    ];
  }
}
