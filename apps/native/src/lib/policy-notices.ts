import { makeFunctionReference } from "convex/server";
import * as Option from "effect/Option";
import * as Atom from "effect/reactivity/Atom";
import * as Schema from "effect/Schema";

import { PolicyNotice } from "@/domain/policy-notice";

import { cloudRuntime } from "./cloud-runtime";

const NOTICES_QUERY = makeFunctionReference<"query", Record<string, never>, unknown>("legal:notices");

const decodeNotices = Schema.decodeUnknownOption(Schema.Array(PolicyNotice));

const NO_NOTICES: readonly PolicyNotice[] = [];

export const policyNoticesAtom = Atom.make((get): readonly PolicyNotice[] => {
    if (cloudRuntime === null) {
        return NO_NOTICES;
    }
    const watch = cloudRuntime.convex.watchQuery(NOTICES_QUERY, {});
    const read = () => {
        try {
            return Option.getOrElse(decodeNotices(watch.localQueryResult()), () => NO_NOTICES);
        } catch {
            return NO_NOTICES;
        }
    };
    get.addFinalizer(watch.onUpdate(() => get.setSelf(read())));
    return read();
}).pipe(Atom.withLabel("legal:notices"));
