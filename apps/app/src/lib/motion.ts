import type { NavigateOptions } from "@tanstack/react-router";
import * as Schema from "effect/Schema";

export const Transition = Schema.Literals(["push-left", "slide-up", "slide-down", "dissolve", "instant"]);
export type Transition = typeof Transition.Type;
export type RouteTransition = Extract<Transition, "push-left" | "dissolve" | "instant">;

export function viewTransition(
    transition: RouteTransition,
    { back = false }: { back?: boolean } = {}
): NavigateOptions["viewTransition"] {
    if (transition === "instant") {
        return false;
    }
    return { types: back ? [transition, "back"] : [transition] };
}
