import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as HttpIncomingMessage from "effect/http/HttpIncomingMessage";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

import type { MarketRateType } from "./lib/currencies";

const COTIZAVE_URL = "https://api.cotizave.com/v2/fx/ve/rates";
const RATES_TIMEOUT = Duration.seconds(20);

const VES_QUOTE = "VES";

/** `reference` is the BCV official rate. */
// A Map: `.get` on an untrusted market name answers undefined without widening the key type.
const MARKET_RATE_TYPES = new Map<string, MarketRateType>([
    ["eur_reference", "eur_reference"],
    ["reference", "official"],
]);

const CotizaveMarket = Schema.Struct({
    market: Schema.String,
    mid: Schema.Finite.check(Schema.isGreaterThan(0)),
});

/** Pinned to the pair we store; an unparseable market entry is dropped, not the whole feed. */
const CotizaveResponse = Schema.Struct({
    base: Schema.Literal("USD"),
    currency: Schema.Literal(VES_QUOTE),
    rates: Schema.Array(
        Schema.NullOr(CotizaveMarket).pipe(Schema.catchDecoding(() => Effect.succeed(Option.some(null))))
    ),
});

export class CotizaveError extends Schema.TaggedError<CotizaveError>()("CotizaveError", {
    cause: Schema.optional(Schema.Defect()),
    reason: Schema.Literals(["transport", "status", "contract"]),
    status: Schema.optional(Schema.Number),
}) {
    override get message(): string {
        if (this.reason === "status") {
            return `Cotizave fetch failed with HTTP ${this.status}`;
        }
        if (this.reason === "contract") {
            return "Cotizave response did not match the expected USD-based VES contract";
        }
        return "Cotizave fetch request failed";
    }
}

const decodeCotizaveResponse = HttpIncomingMessage.schemaBodyJson(CotizaveResponse);

const transport = (cause: unknown) => new CotizaveError({ cause, reason: "transport" });

export const requestRates = Effect.fn("Cotizave.requestRates")(
    function* requestRates(apiKey: Redacted.Redacted) {
        const response = yield* HttpClient.execute(
            HttpClientRequest.get(COTIZAVE_URL).pipe(HttpClientRequest.setHeader("X-API-Key", Redacted.value(apiKey)))
        ).pipe(Effect.catchTags({ HttpClientError: transport }));
        if (response.status < 200 || response.status >= 300) {
            return yield* new CotizaveError({ reason: "status", status: response.status });
        }
        return yield* decodeCotizaveResponse(response).pipe(
            Effect.catchTags({
                HttpClientError: transport,
                SchemaError: (cause) => new CotizaveError({ cause, reason: "contract" }),
            })
        );
    },
    Effect.timeout(RATES_TIMEOUT),
    Effect.catchTags({ TimeoutError: transport })
);

interface CotizaveRate {
    quote: string;
    rate: number;
    rateType: MarketRateType;
}

export function extractRates(payload: typeof CotizaveResponse.Type): CotizaveRate[] {
    const parsed: CotizaveRate[] = [];
    for (const record of payload.rates) {
        const rateType = record === null ? undefined : MARKET_RATE_TYPES.get(record.market);
        if (record === null || rateType === undefined) {
            continue;
        }
        parsed.push({ quote: VES_QUOTE, rate: record.mid, rateType });
    }
    return parsed;
}
