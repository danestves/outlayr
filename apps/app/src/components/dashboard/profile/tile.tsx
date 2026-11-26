import type { ComponentProps } from "react";

import { LookTile } from "@/components/ledger/tiles";
import type { ProfileLook } from "@/lib/profile-registry";

export const PERSONAL_LOOK: ProfileLook = {
    color: null,
    emoji: null,
    icon: "Home01",
    imageKey: null,
};

export function ProfileTile({
    look,
    size = "md",
}: {
    look: ProfileLook;
    size?: ComponentProps<typeof LookTile>["size"];
}) {
    return <LookTile look={look} size={size} />;
}
