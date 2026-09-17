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
        title: "Land on AAPL",
        lookFor: "Default ticker. No wallet, no fill.",
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
        lookFor: "AAPLx is Raydium-first. AAPLon says so if Raydium has no pool.",
      },
      {
        n: "05",
        title: "Switch ticker",
        lookFor: "Rail or type a US symbol. Unknown names stay empty.",
      },
    ];
  }
}
