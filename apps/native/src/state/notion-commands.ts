import * as Effect from "effect/Effect";
import * as Atom from "effect/reactivity/Atom";

import { connectNotion, disconnectNotion, isNotionConnected, notionCsv, notionSources } from "@/lib/notion-connect";

import { createCommand } from "./atom-command";
import { readPickedImport } from "./editor-commands";

export type NotionConnection =
    | { readonly kind: "disconnected" }
    | { readonly kind: "signedOut" }
    | {
          readonly found: Effect.Success<ReturnType<typeof notionSources>> | null;
          readonly kind: "connected";
      };

const loadConnection = Effect.fn("Notion.loadConnection")(function* loadConnection(entitled: boolean) {
    if (!(yield* isNotionConnected())) {
        return { kind: "disconnected" } as const;
    }
    return { found: entitled ? yield* notionSources() : null, kind: "connected" } as const;
});

export const notionConnectionAtom = Atom.family(
    (key: { readonly accountId: string | null; readonly attempt: number; readonly entitled: boolean }) =>
        Atom.make(
            key.accountId === null
                ? Effect.succeed<NotionConnection>({ kind: "signedOut" })
                : loadConnection(key.entitled)
        ).pipe(Atom.withLabel("notion:connection"))
);

export const connectNotionCommand = createCommand({
    execute: (_input: undefined) => connectNotion(),
    label: "notion:connect",
});

export const disconnectNotionCommand = createCommand({
    execute: (_input: undefined) => disconnectNotion(),
    label: "notion:disconnect",
});

export const importNotionCommand = createCommand({
    execute: Effect.fn("Notion.import")(function* importNotion(input: { ids: readonly string[]; name: string }) {
        const { csv, truncated } = yield* notionCsv(input.ids);
        return { chosen: csv === null ? null : readPickedImport({ name: input.name, text: csv }), truncated };
    }),
    label: "notion:import",
});
