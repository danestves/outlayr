import { useIntlayer } from "react-intlayer";

import { Icon } from "./icon";
import { LocalizedLink } from "./localized-link";

const HUBS = { "/compare": "compare", "/guides": "guides", "/tools": "tools" } as const;

export function HubTrail({ hub }: { hub: keyof typeof HUBS }) {
    const { footer } = useIntlayer("site");
    return (
        <LocalizedLink
            className="fluid text-muted hover:text-foreground group inline-flex items-center gap-2 font-mono text-xs tracking-widest uppercase"
            to={hub}
        >
            <Icon className="fluid group-hover:-translate-x-0.5" name="arrow-left" />
            {footer[HUBS[hub]]}
        </LocalizedLink>
    );
}
