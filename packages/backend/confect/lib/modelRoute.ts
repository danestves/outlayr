import type { Route } from "@outlayr/model-router/route";
import type { LanguageModelMiddleware } from "ai";

import { claudeFastModelId, claudeGroundedModelId, claudeModelId } from "./config";

export const routeMiddleware = ({
    effort,
    maxTokens,
}: Pick<Route, "effort" | "maxTokens">): LanguageModelMiddleware => ({
    transformParams: async ({ params }) => ({
        ...params,
        reasoning: effort ?? params.reasoning,
        maxOutputTokens: maxTokens ?? params.maxOutputTokens,
    }),
});

export const routedModelId = ({ grounded, model }: Pick<Route, "grounded" | "model">) => {
    if (grounded) {
        return claudeGroundedModelId;
    }
    return model === "standard" ? claudeModelId : claudeFastModelId;
};
