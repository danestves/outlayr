import { scheduleTask } from "@effect/atom-react/RegistryContext";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";

export const appAtomRegistry = AtomRegistry.make({ scheduleTask });
