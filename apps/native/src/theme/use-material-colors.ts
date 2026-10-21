import { useMemo } from "react";
import { useCSSVariable } from "uniwind";

import { MATERIAL_ROLE_VARIABLES, MATERIAL_ROLES } from "./material-roles";
import type { MaterialRoleColors } from "./material-roles";

const VARIABLE_NAMES = MATERIAL_ROLES.map((role) => MATERIAL_ROLE_VARIABLES[role]);

/** Not `@expo/ui`'s hook: that returns the raw wallpaper scheme, before the contrast clamp. */
export function useMaterialColors(): MaterialRoleColors {
    const values = useCSSVariable(VARIABLE_NAMES);

    return useMemo(
        // SAFETY: `fromEntries` loses the key union; `values` is uniwind's read of the same names in the same order.
        () =>
            Object.fromEntries(
                MATERIAL_ROLES.map((role, index) => [role, values[index] as string])
            ) as MaterialRoleColors,
        [values]
    );
}
