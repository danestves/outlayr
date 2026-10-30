import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as HttpIncomingMessage from "effect/http/HttpIncomingMessage";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

const AD_LIST_URL = "https://www.binance.com/bapi/c2c/v1/public/c2c/agent/ad-list";
const RATES_TIMEOUT = Duration.seconds(20);

const BinanceAd = Schema.Struct({
    advertiser: Schema.Struct({ userType: Schema.String }),
    asset: Schema.Literal("USDT"),
    fiat: Schema.Literal("VES"),
    price: Schema.Finite.check(Schema.isGreaterThan(0)),
});

const AdListResponse = Schema.Struct({
    data: Schema.Struct({
        items: Schema.Array(
            Schema.NullOr(BinanceAd).pipe(Schema.catchDecoding(() => Effect.succeed(Option.some(null))))
        ),
    }),
});

export class BinanceError extends Schema.TaggedError<BinanceError>()("BinanceError", {
    cause: Schema.optional(Schema.Defect()),
    reason: Schema.Literals(["transport", "status", "contract"]),
    status: Schema.optional(Schema.Number),
}) {
    override get message(): string {
        if (this.reason === "status") {
            return `Binance P2P fetch failed with HTTP ${this.status}`;
        }
        if (this.reason === "contract") {
            return "Binance P2P response did not match the expected USDT/VES ad list";
        }
        return "Binance P2P fetch request failed";
    }
}

const decodeAdListResponse = HttpIncomingMessage.schemaBodyJson(AdListResponse);

const transport = (cause: unknown) => new BinanceError({ cause, reason: "transport" });

export const requestSellAds = Effect.fn("Binance.requestSellAds")(
    function* requestSellAds() {
        const response = yield* HttpClient.execute(
            HttpClientRequest.get(AD_LIST_URL).pipe(
                HttpClientRequest.setUrlParams({ asset: "USDT", fiat: "VES", limit: "20", tradeType: "SELL" })
            )
        ).pipe(Effect.catchTags({ HttpClientError: transport }));
        if (response.status < 200 || response.status >= 300) {
            return yield* new BinanceError({ reason: "status", status: response.status });
        }
        return yield* decodeAdListResponse(response).pipe(
            Effect.catchTags({
                HttpClientError: transport,
                SchemaError: (cause) => new BinanceError({ cause, reason: "contract" }),
            })
        );
    },
    Effect.timeout(RATES_TIMEOUT),
    Effect.catchTags({ TimeoutError: transport })
);

export function bestMerchantBid(payload: typeof AdListResponse.Type): number | undefined {
    const prices = payload.data.items.flatMap((ad) =>
        ad !== null && ad.advertiser.userType === "merchant" ? [ad.price] : []
    );
    return prices.length === 0 ? undefined : Math.max(...prices);
}
