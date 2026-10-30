import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import type * as Schema from "effect/Schema";

import { components } from "../convex/_generated/api";
import type { SubmitStatus, submitArgs } from "./featureRequests.spec";
import { capturePostHogEvent } from "./lib/posthog";

export const SURVEY_ID = "01a18b43-8c63-0000-163a-cbe3b5a67a1d";
export const QUESTIONS = {
    email: { id: "dcf8ae93-2c83-4830-8cc3-ddca7ce0ccf1", question: "Email me when it ships" },
    reason: { id: "986dc827-6392-4690-8e91-4f9445344396", question: "so I could" },
    wish: { id: "f91e6ef6-04c8-47b8-8405-c94f649bff58", question: "I wish Outlayr could" },
} as const;

export const MAX_TEXT = 1000;
const MAX_CONTEXT = 64;
const CAPTURE_TIMEOUT = Duration.seconds(5);

type SubmitArgs = Schema.Struct<typeof submitArgs>["Type"];

interface SurveyProperties {
    $app_version: string;
    $locale: string;
    $os_name: string;
    $os_version: string;
    $process_person_profile?: false;
    $survey_completed: true;
    $survey_id: string;
    $survey_questions: readonly { id: string; question: string }[];
    $survey_submission_id: string;
    [response: `$survey_response_${string}`]: string;
}

export interface Account {
    email: string;
    userId: string;
}

export const rateLimiter = new RateLimiter(components.rateLimiter, {
    featureRequestsAnonymous: { kind: "fixed window", period: HOUR, rate: 50 },
    featureRequestsGlobal: { kind: "fixed window", period: HOUR, rate: 100, shards: 10 },
    featureRequestsPerUser: { capacity: 5, kind: "token bucket", period: HOUR, rate: 10 },
});

export function surveyEvent(args: SubmitArgs, account: Account | null) {
    const wish = args.wish.trim();
    const reason = args.reason.trim();
    const submissionId = args.submissionId.trim();
    if (
        wish === "" ||
        wish.length > MAX_TEXT ||
        reason.length > MAX_TEXT ||
        submissionId === "" ||
        submissionId.length > MAX_CONTEXT
    ) {
        return null;
    }
    const linked = account !== null && (args.linkAccount || args.notify);
    const answers = [
        [QUESTIONS.wish.id, wish],
        [QUESTIONS.reason.id, reason],
        [QUESTIONS.email.id, args.notify ? (account?.email ?? "") : ""],
    ] as const;
    const properties: SurveyProperties = {
        $app_version: args.appVersion.slice(0, MAX_CONTEXT),
        $locale: args.locale.slice(0, MAX_CONTEXT),
        $os_name: args.osName.slice(0, MAX_CONTEXT),
        $os_version: args.osVersion.slice(0, MAX_CONTEXT),
        $survey_completed: true,
        $survey_id: SURVEY_ID,
        $survey_questions: Object.values(QUESTIONS),
        $survey_submission_id: submissionId,
    };
    for (const [id, answer] of answers) {
        if (answer !== "") {
            properties[`$survey_response_${id}`] = answer;
        }
    }
    if (!linked) {
        properties.$process_person_profile = false;
    }
    return { distinct_id: linked ? account.userId : crypto.randomUUID(), event: "survey sent", properties };
}

export const captureSurveyEvent = Effect.fn("FeatureRequests.capture")(
    function* captureSurveyEvent(event: NonNullable<ReturnType<typeof surveyEvent>>) {
        const response = yield* capturePostHogEvent(event, CAPTURE_TIMEOUT);
        if (Option.isNone(response)) {
            return "notConfigured" satisfies SubmitStatus;
        }
        const { status } = response.value;
        return status >= 200 && status < 300 ? "ok" : "providerError";
    },
    Effect.catchTags({
        HttpBodyError: () => Effect.succeed("providerError" as const),
        HttpClientError: () => Effect.succeed("providerError" as const),
        TimeoutError: () => Effect.succeed("providerError" as const),
    })
);
