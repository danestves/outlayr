import * as Schema from "effect/Schema";

export const RateSource = Schema.Literals(["frankfurter", "cotizave", "openexchangerates", "binance"]);

export type RateSource = typeof RateSource.Type;
