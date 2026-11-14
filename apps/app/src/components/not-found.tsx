import { Link } from "@tanstack/react-router";
import { useIntlayer } from "react-intlayer";

import { Muted, SOLID_PILL, Screen } from "./account/parts";

export function NotFound() {
    const copy = useIntlayer("not-found");
    return (
        <Screen title={copy.title}>
            <Muted>{copy.meta}</Muted>
            <Link className={SOLID_PILL} to="/">
                {copy.home}
            </Link>
        </Screen>
    );
}
