import { RegistryContext } from "@effect/atom-react/RegistryContext";
import { use } from "react";

import { runAtomCommand } from "./atom-command";
import type { AtomCommand, AtomCommandOptions } from "./atom-command";

export function useAtomCommand<W, A, E>(command: AtomCommand<W, A, E>, options?: AtomCommandOptions) {
    const registry = use(RegistryContext);
    return (input: W) => runAtomCommand(registry, command, input, options);
}
