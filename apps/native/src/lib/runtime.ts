import * as Atom from "effect/reactivity/Atom";

import * as LocalDatabase from "@/data/local-database";

export const appRuntime = Atom.runtime(LocalDatabase.layer);
