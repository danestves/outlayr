import type { ReactNode } from "react";

import { Phone } from "@/stageshow/phone";

export const PHONE_WIDTH = 428;

export function PhoneFit({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
    return (
        <div className="hz-phone-fit">
            <Phone dark={dark} frame="pro" width={PHONE_WIDTH}>
                {children}
            </Phone>
        </div>
    );
}
