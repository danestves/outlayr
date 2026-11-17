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

export const RouteReason = Schema.Literals(["feature_default", "new_category"]);

export const RouteRequest = Schema.Struct({
    budget: Schema.optionalKey(Budget),
    feature: Feature,
});
export type RouteRequest = typeof RouteRequest.Type;

export const Route = Schema.Struct({
    effort: Schema.NullOr(Effort),
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
    // Null sends no effort or thinking setting, as the grounded call always did.
    grounded_lookup: { effort: null, grounded: true, maxTokens: null, model: "fast" },
    installment_scan: { effort: "low", grounded: false, maxTokens: null, model: "standard" },
    notification_read: { effort: "low", grounded: false, maxTokens: null, model: "fast" },
    // A chunk answers with a few hundred rows, far past the provider's default cap.
    pdf_import: { effort: "low", grounded: false, maxTokens: 16_000, model: "fast" },
    receipt_scan: { effort: "low", grounded: false, maxTokens: null, model: "standard" },
    voice_entry: { effort: "low", grounded: false, maxTokens: null, model: "standard" },
} satisfies Record<Feature, Omit<Route, "feature" | "reason">>;

export function route({ feature }: RouteRequest): Route {
    return { ...DEFAULTS[feature], feature, reason: "feature_default" };
}

/** The Sonnet retry after a background answer, or null when the first answer stands. */
export function escalation(request: RouteRequest, answer: { readonly isNewCategory: boolean }): Route | null {
    if (request.feature !== "background_suggest" || request.budget === "exhausted" || !answer.isNewCategory) {
        return null;
    }
    return { ...route(request), model: "standard", reason: "new_category" };
}
