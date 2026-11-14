interface ModelContextToolAnnotations {
    consequentialHint?: boolean;
    debugging?: boolean;
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
}

interface ModelContextTool<Input> {
    annotations?: ModelContextToolAnnotations;
    description: string;
    execute: (input: Input, options: { signal: AbortSignal }) => object | Promise<object>;
    inputSchema?: object;
    name: string;
    outputSchema?: object;
    title?: string;
}

interface ModelContext extends EventTarget {
    registerTool: <Input>(
        tool: ModelContextTool<Input>,
        options?: { exposedTo?: string[]; signal?: AbortSignal }
    ) => Promise<void>;
}

interface Document {
    readonly modelContext?: ModelContext;
}
