import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as HttpIncomingMessage from "effect/http/HttpIncomingMessage";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

const LATEST_URL = "https://openexchangerates.org/api/latest.json";
const RATES_TIMEOUT = Duration.seconds(20);
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

export class OpenExchangeRatesError extends Schema.TaggedError<OpenExchangeRatesError>()("OpenExchangeRatesError", {
    cause: Schema.optional(Schema.Defect()),
    reason: Schema.Literals(["transport", "status", "contract"]),
    status: Schema.optional(Schema.Number),
}) {
    override get message(): string {
        if (this.reason === "status") {
            return `Open Exchange Rates fetch failed with HTTP ${this.status}`;
        }
        if (this.reason === "contract") {
            return "Open Exchange Rates response did not match the USD-based latest contract";
        }
        return "Open Exchange Rates fetch request failed";
    }
}

const decodeLatestResponse = HttpIncomingMessage.schemaBodyJson(LatestResponse);

const transport = (cause: unknown) => new OpenExchangeRatesError({ cause, reason: "transport" });

export const requestLatest = Effect.fn("OpenExchangeRates.requestLatest")(
    function* requestLatest(appId: string) {
        const response = yield* HttpClient.execute(
            HttpClientRequest.get(LATEST_URL).pipe(HttpClientRequest.setUrlParam("app_id", appId))
        ).pipe(Effect.catchTags({ HttpClientError: transport }));
        if (response.status < 200 || response.status >= 300) {
            return yield* new OpenExchangeRatesError({ reason: "status", status: response.status });
        }
        return yield* decodeLatestResponse(response).pipe(
            Effect.catchTags({
                HttpClientError: transport,
                SchemaError: (cause) => new OpenExchangeRatesError({ cause, reason: "contract" }),
            })
        );
    },
    Effect.timeout(RATES_TIMEOUT),
    Effect.catchTags({ TimeoutError: transport })
);

export function officialRates(response: typeof LatestResponse.Type) {
    return Object.entries(response.rates).flatMap(([quote, rate]) =>
        rate !== null && quote !== BASE && CURRENCY_CODE_PATTERN.test(quote)
            ? [{ quote, rate, rateType: "official" as const }]
            : []
    );
}
