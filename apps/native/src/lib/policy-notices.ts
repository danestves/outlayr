import { PolicyNotice } from "@outlayr/backend/confect/legal";
import { api } from "@outlayr/backend/convex/_generated/api";
import * as Option from "effect/Option";
import * as Atom from "effect/reactivity/Atom";
import * as Schema from "effect/Schema";

import { cloudRuntime } from "./cloud-runtime";

const decodeNotices = Schema.decodeUnknownOption(Schema.Array(PolicyNotice));

const NO_NOTICES: readonly PolicyNotice[] = [];

export const policyNoticesAtom = Atom.make((get): readonly PolicyNotice[] => {
    if (cloudRuntime === null) {
        return NO_NOTICES;
    }
    const watch = cloudRuntime.convex.watchQuery(api.legal.notices, {});
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
