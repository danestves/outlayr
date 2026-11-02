import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as HttpIncomingMessage from "effect/http/HttpIncomingMessage";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

export const WEEKS = 12;
export const MONTHS = 12;
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT = Duration.seconds(20);
const REPO = "danestves/outlayr";
const PULL_PAGE_SIZE = 100;
const MAX_PULL_PAGES = 10;
const APP_OPENED = "Application Opened";
const ENTRY_SAVED = "transaction_saved";

const Month = Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}$/));

const PostHogStats = Schema.Struct({
    months: Schema.Array(Schema.Struct({ entries: Schema.Number, month: Month, people: Schema.Number })),
    weeks: Schema.Array(Schema.Struct({ countries: Schema.Number, entries: Schema.Number, people: Schema.Number })),
});

const AccountStats = Schema.Struct({
    months: Schema.Array(Schema.Struct({ added: Schema.Number, month: Month })),
    weeks: Schema.Array(Schema.Number),
});

const RevenueStats = Schema.Struct({
    activeSubscriptions: Schema.Number,
    months: Schema.Array(Schema.Struct({ month: Month, proceeds: Schema.Number })),
});

const GitHubStats = Schema.Struct({
    contributors: Schema.Number,
    months: Schema.Array(Schema.Struct({ mergedPrs: Schema.Number, month: Month })),
    stars: Schema.Number,
});

export const OpenStatsSnapshot = Schema.Struct({
    accounts: AccountStats,
    computedAt: Schema.Number,
    github: Schema.NullOr(GitHubStats),
    posthog: Schema.NullOr(PostHogStats),
    revenue: Schema.NullOr(RevenueStats),
});

export type OpenStatsSnapshot = typeof OpenStatsSnapshot.Type;

export class OpenStatsError extends Schema.TaggedError<OpenStatsError>()("OpenStatsError", {
    cause: Schema.optional(Schema.Defect()),
    reason: Schema.Literals(["transport", "status", "contract"]),
    source: Schema.Literals(["posthog", "revenuecat", "github"]),
    status: Schema.optional(Schema.Number),
}) {
    override get message(): string {
        if (this.reason === "status") {
            return `Open stats ${this.source} request failed with HTTP ${this.status}`;
        }
        if (this.reason === "contract") {
            return `Open stats ${this.source} response did not match the expected shape`;
        }
        return `Open stats ${this.source} request failed`;
    }
}

const fetchJson = Effect.fn("OpenStats.fetchJson")(
    function* fetchJson<S extends Schema.Constraint>(
        source: OpenStatsError["source"],
        request: HttpClientRequest.HttpClientRequest,
        schema: S
    ) {
        const transport = (cause: unknown) => new OpenStatsError({ cause, reason: "transport", source });
        const response = yield* HttpClient.execute(request).pipe(Effect.catchTags({ HttpClientError: transport }));
        if (response.status < 200 || response.status >= 300) {
            return yield* new OpenStatsError({ reason: "status", source, status: response.status });
        }
        return yield* HttpIncomingMessage.schemaBodyJson(schema)(response).pipe(
            Effect.catchTags({
                HttpClientError: transport,
                SchemaError: (cause) => new OpenStatsError({ cause, reason: "contract", source }),
            })
        );
    },
    (effect, source) =>
        effect.pipe(
            Effect.timeout(REQUEST_TIMEOUT),
            Effect.catchTags({ TimeoutError: (cause) => new OpenStatsError({ cause, reason: "transport", source }) })
        )
);

export const monthKey = (ms: number) => new Date(ms).toISOString().slice(0, 7);

export function recentMonths(now: number): string[] {
    const date = new Date(now);
    return Array.from({ length: MONTHS }, (_, index) =>
        monthKey(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - (MONTHS - 1 - index), 1))
    );
}

export function accountStats(createdAt: readonly number[], now: number): typeof AccountStats.Type {
    const weeks = Array.from(
        { length: WEEKS },
        (_, index) => createdAt.filter((at) => at <= now - (WEEKS - 1 - index) * WEEK_MS).length
    );
    const months = recentMonths(now).map((month) => ({
        added: createdAt.filter((at) => monthKey(at) === month).length,
        month,
    }));
    return { months, weeks };
}

export function weeksFromRows(rows: readonly (readonly [number, number, number, number])[]) {
    const weeks = Array.from({ length: WEEKS }, () => ({ countries: 0, entries: 0, people: 0 }));
    for (const [ago, people, entries, countries] of rows) {
        if (ago >= 0 && ago < WEEKS) {
            weeks[WEEKS - 1 - ago] = { countries, entries, people };
        }
    }
    return weeks;
}

const WeeklyRows = Schema.Struct({
    results: Schema.Array(Schema.Tuple([Schema.Number, Schema.Number, Schema.Number, Schema.Number])),
});
const MonthlyRows = Schema.Struct({ results: Schema.Array(Schema.Tuple([Month, Schema.Number, Schema.Number])) });

const weeklyQuery = `
SELECT
    intDiv(dateDiff('second', timestamp, now()), ${WEEK_MS / 1000}) AS ago,
    uniqIf(person_id, event = '${APP_OPENED}') AS people,
    countIf(event = '${ENTRY_SAVED}') AS entries,
    uniqIf(properties.$geoip_country_code, event = '${APP_OPENED}') AS countries
FROM events
WHERE timestamp > now() - INTERVAL ${WEEKS} WEEK AND event IN ('${APP_OPENED}', '${ENTRY_SAVED}')
GROUP BY ago`;

const monthlyQuery = `
SELECT
    formatDateTime(toStartOfMonth(toTimeZone(timestamp, 'UTC')), '%Y-%m') AS month,
    uniqIf(person_id, event = '${APP_OPENED}') AS people,
    countIf(event = '${ENTRY_SAVED}') AS entries
FROM events
WHERE timestamp >= toStartOfMonth(now() - INTERVAL ${MONTHS - 1} MONTH) AND event IN ('${APP_OPENED}', '${ENTRY_SAVED}')
GROUP BY month
ORDER BY month`;

export const fetchPostHogStats = Effect.fn("OpenStats.fetchPostHogStats")(function* fetchPostHogStats(config: {
    personalApiKey: Redacted.Redacted;
    projectId: string;
}) {
    const query = <S extends Schema.Constraint>(hogql: string, schema: S) =>
        HttpClientRequest.post(
            `https://us.posthog.com/api/projects/${encodeURIComponent(config.projectId)}/query/`
        ).pipe(
            HttpClientRequest.bearerToken(Redacted.value(config.personalApiKey)),
            HttpClientRequest.bodyJsonUnsafe({ query: { kind: "HogQLQuery", query: hogql } }),
            (request) => fetchJson("posthog", request, schema)
        );
    const [weekly, monthly] = yield* Effect.all([query(weeklyQuery, WeeklyRows), query(monthlyQuery, MonthlyRows)], {
        concurrency: "unbounded",
    });
    return {
        months: monthly.results.map(([month, people, entries]) => ({ entries, month, people })),
        weeks: weeksFromRows(weekly.results),
    };
});

const OverviewMetrics = Schema.Struct({
    metrics: Schema.Array(Schema.Struct({ id: Schema.String, value: Schema.Number })),
});

export function monthDates(month: string, now: number) {
    const [year, monthIndex] = month.split("-").map(Number);
    const lastDay = Date.UTC(year ?? 0, monthIndex ?? 0, 0);
    return { endDate: new Date(Math.min(lastDay, now)).toISOString().slice(0, 10), startDate: `${month}-01` };
}

export const fetchRevenueStats = Effect.fn("OpenStats.fetchRevenueStats")(function* fetchRevenueStats(
    config: { projectId: string; secretKey: Redacted.Redacted },
    now: number
) {
    const base = `https://api.revenuecat.com/v2/projects/${encodeURIComponent(config.projectId)}/metrics`;
    const get = <S extends Schema.Constraint>(path: string, params: Record<string, string>, schema: S) =>
        fetchJson(
            "revenuecat",
            HttpClientRequest.get(`${base}/${path}`).pipe(
                HttpClientRequest.bearerToken(Redacted.value(config.secretKey)),
                HttpClientRequest.setUrlParams({ currency: "USD", ...params })
            ),
            schema
        );
    const overview = yield* get("overview", {}, OverviewMetrics);
    const months = yield* Effect.all(
        recentMonths(now).map((month) => {
            const { endDate, startDate } = monthDates(month, now);
            return get(
                "revenue",
                { end_date: endDate, revenue_type: "proceeds", start_date: startDate },
                Schema.Struct({ value: Schema.Number })
            ).pipe(Effect.map(({ value }) => ({ month, proceeds: value })));
        })
    );
    return {
        activeSubscriptions: overview.metrics.find(({ id }) => id === "active_subscriptions")?.value ?? 0,
        months,
    };
});

const PullPage = Schema.Array(Schema.Struct({ merged_at: Schema.NullOr(Schema.String) }));

export const fetchGitHubStats = Effect.fn("OpenStats.fetchGitHubStats")(function* fetchGitHubStats(
    token: Option.Option<Redacted.Redacted>,
    now: number
) {
    const get = <S extends Schema.Constraint>(path: string, schema: S) =>
        fetchJson(
            "github",
            HttpClientRequest.get(`https://api.github.com/repos/${REPO}${path}`).pipe(
                HttpClientRequest.setHeaders({
                    Accept: "application/vnd.github+json",
                    "User-Agent": "outlayr-open-stats",
                }),
                Option.isSome(token) ? HttpClientRequest.bearerToken(Redacted.value(token.value)) : (request) => request
            ),
            schema
        );
    const [repo, contributors] = yield* Effect.all(
        [
            get("", Schema.Struct({ stargazers_count: Schema.Number })),
            get("/contributors?per_page=100", Schema.Array(Schema.Struct({ type: Schema.String }))),
        ],
        { concurrency: "unbounded" }
    );
    const mergedAt: number[] = [];
    for (let page = 1; page <= MAX_PULL_PAGES; page += 1) {
        const pulls = yield* get(`/pulls?state=closed&per_page=${PULL_PAGE_SIZE}&page=${page}`, PullPage);
        for (const { merged_at: merged } of pulls) {
            if (merged !== null) {
                mergedAt.push(Date.parse(merged));
            }
        }
        if (pulls.length < PULL_PAGE_SIZE) {
            break;
        }
    }
    return {
        contributors: contributors.filter(({ type }) => type !== "Bot").length,
        months: recentMonths(now).map((month) => ({
            mergedPrs: mergedAt.filter((at) => monthKey(at) === month).length,
            month,
        })),
        stars: repo.stargazers_count,
    };
});
