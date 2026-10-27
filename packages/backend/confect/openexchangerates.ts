import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

const LATEST_URL = "https://openexchangerates.org/api/latest.json";
const RATES_TIMEOUT_MS = 20_000;
export const MS_PER_SECOND = 1000;
const BASE = "USD";
const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

const LatestResponse = Schema.Struct({
    base: Schema.Literal(BASE),
    rates: Schema.Record(
        Schema.String,
        Schema.NullOr(Schema.Finite.check(Schema.isGreaterThan(0))).pipe(
            Schema.catchDecoding(() => Effect.succeed(Option.some(null)))
        )
    ),
    timestamp: Schema.Int.check(Schema.isGreaterThan(0)),
});

export function requestLatest(appId: string): Promise<Response> {
    return fetch(`${LATEST_URL}?app_id=${encodeURIComponent(appId)}`, {
        signal: AbortSignal.timeout(RATES_TIMEOUT_MS),
    });
}

export const decodeLatestResponse = Schema.decodeUnknownOption(LatestResponse);

export function officialRates(response: typeof LatestResponse.Type) {
    return Object.entries(response.rates).flatMap(([quote, rate]) =>
        rate !== null && quote !== BASE && CURRENCY_CODE_PATTERN.test(quote)
            ? [{ quote, rate, rateType: "official" as const }]
            : []
    );
}
