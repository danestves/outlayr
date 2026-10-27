interface ImportMetaEnv {
    readonly VITE_CONVEX_SITE_URL?: string;
    readonly VITE_CONVEX_URL?: string;
    readonly VITE_PUBLIC_POSTHOG_PROJECT_TOKEN?: string;
}

interface ModelContextTool<Input> {
    annotations?: { readOnlyHint?: boolean };
    description: string;
    execute: (input: Input) => object | Promise<object>;
    inputSchema?: object;
    name: string;
}

interface ModelContext {
    registerTool: <Input>(
        tool: ModelContextTool<Input>,
        options?: { signal?: AbortSignal }
    ) => Promise<void> | undefined;
}

interface Navigator {
    readonly modelContext?: ModelContext;
}

interface Document {
    readonly modelContext?: ModelContext;
}
