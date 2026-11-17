import * as Schema from "effect/Schema";

export const Feature = Schema.Literals([
    "category_suggest",
    "background_suggest",
    "grounded_lookup",
    "receipt_scan",
    "installment_scan",
    "voice_entry",
    "notification_read",
    "csv_import",
    "pdf_import",
]);
export type Feature = typeof Feature.Type;

export const ModelTier = Schema.Literals(["fast", "standard"]);
export const Effort = Schema.Literals(["low", "medium", "high"]);
export const Budget = Schema.Literals(["open", "exhausted"]);

export const RouteReason = Schema.Literals(["feature_default", "transfer_name", "new_category", "budget_exhausted"]);
export type RouteReason = typeof RouteReason.Type;

export const RouteRequest = Schema.Struct({
    budget: Schema.optionalKey(Budget),
    feature: Feature,
    name: Schema.optionalKey(Schema.String),
});
export type RouteRequest = typeof RouteRequest.Type;

export const Route = Schema.Struct({
    effort: Effort,
    feature: Feature,
    grounded: Schema.Boolean,
    maxTokens: Schema.NullOr(Schema.Int),
    model: ModelTier,
    reason: RouteReason,
});
export type Route = typeof Route.Type;

const DEFAULTS = {
    background_suggest: { effort: "low", grounded: false, maxTokens: null, model: "fast" },
    category_suggest: { effort: "low", grounded: false, maxTokens: null, model: "fast" },
    csv_import: { effort: "low", grounded: false, maxTokens: null, model: "fast" },
    // Medium is Haiku's own default, which the grounded call always ran at.
    grounded_lookup: { effort: "medium", grounded: true, maxTokens: null, model: "fast" },
    installment_scan: { effort: "low", grounded: false, maxTokens: null, model: "standard" },
    notification_read: { effort: "low", grounded: false, maxTokens: null, model: "fast" },
    // A chunk answers with a few hundred rows, far past the provider's default cap.
    pdf_import: { effort: "low", grounded: false, maxTokens: 16_000, model: "fast" },
    receipt_scan: { effort: "low", grounded: false, maxTokens: null, model: "standard" },
    voice_entry: { effort: "low", grounded: false, maxTokens: null, model: "standard" },
} satisfies Record<Feature, Omit<Route, "feature" | "reason">>;

// Haiku gave three different categories for "Binance P2P" across runs; Sonnet gave one.
const TRANSFER = /\b(?:zelle|venmo|cash\s?app|pago\s?m[oó]vil|transferencia|transfer|p2p|binance|zinli|airtm|usdt)\b/i;

const at = (feature: Feature, reason: RouteReason, model?: Route["model"]): Route => ({
    ...DEFAULTS[feature],
    feature,
    model: model ?? DEFAULTS[feature].model,
    reason,
});

export function route(request: RouteRequest): Route {
    if (request.feature !== "background_suggest" || request.name === undefined || !TRANSFER.test(request.name)) {
        return at(request.feature, "feature_default");
    }
    return request.budget === "exhausted"
        ? at(request.feature, "budget_exhausted")
        : at(request.feature, "transfer_name", "standard");
}

/** The second try after a fast background answer, or null when the first answer stands. */
export function escalation(
    request: RouteRequest,
    first: Route,
    answer: { readonly isNewCategory: boolean }
): Route | null {
    const canEscalate =
        request.feature === "background_suggest" && first.model === "fast" && request.budget !== "exhausted";
    return canEscalate && answer.isNewCategory ? at(request.feature, "new_category", "standard") : null;
}
