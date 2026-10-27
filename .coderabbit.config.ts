import { defineConfig } from "@coderabbitai/config";
import type { CodeRabbitContext } from "@coderabbitai/config";

const UNGATED_AUTHORS = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
const isGated = ({ pr }: CodeRabbitContext) => !UNGATED_AUTHORS.has(pr?.authorAssociation ?? "");

export default defineConfig((ctx) => ({
    reviews: {
        high_level_summary: false,
        review_status: false,
        request_changes_workflow: false,
        allow_author_approval: !isGated(ctx),
        auto_review: {
            enabled: true,
        },
        pre_merge_checks: {
            docstrings: { mode: "off" },
            override_requested_reviewers_only: isGated(ctx),
        },
        path_filters: ["!**/_generated/**", "!apps/native/src/screens/settings/licenses.json"],
        path_instructions: [
            {
                path: "{apps,packages}/**/*.{ts,tsx}",
                instructions: "Hold changed Effect code to the rules in docs/internals/effect-services.md.",
            },
            {
                path: "packages/backend/confect/**/*.ts",
                instructions: "Hold changed code to the layout in docs/internals/confect.md.",
            },
            {
                path: "**/*.test.{ts,tsx}",
                instructions:
                    "Hold changed tests to the Testing section of AGENTS.md. Request tests only as those rules allow.",
            },
        ],
    },
    knowledge_base: {
        code_guidelines: {
            filePatterns: [
                { files: "docs/internals/effect-services.md", applyTo: "{apps,packages}/**/*.{ts,tsx}" },
                { files: "docs/internals/confect.md", applyTo: "packages/backend/confect/**/*.ts" },
                { files: "docs/internals/library-traps.md", applyTo: "{apps,packages}/**/*.{ts,tsx}" },
            ],
        },
    },
}));
