import { Redirect } from "expo-router";
import { useState } from "react";

import { CloseToolbar } from "@/components/close-toolbar";
import ProfileEditor from "@/components/profile-editor";
import { paywallHref } from "@/domain/paywall-trigger";
import { useProLocked } from "@/hooks/use-pro-locked";

export default function ProfileCreateScreen() {
    const [locked] = useState(useProLocked());

    if (locked) {
        return <Redirect href={paywallHref("profiles")} />;
    }

    return (
        <>
            <CloseToolbar placement="right" />
            <ProfileEditor mode="create" />
        </>
    );
}
