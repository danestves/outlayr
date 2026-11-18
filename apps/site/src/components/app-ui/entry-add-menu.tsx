import Mic01Icon from "@hugeicons/core-free-icons/Mic01Icon";
import ScanIcon from "@hugeicons/core-free-icons/ScanIcon";
import ShoppingCart01Icon from "@hugeicons/core-free-icons/ShoppingCart01Icon";
import Wallet01Icon from "@hugeicons/core-free-icons/Wallet01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { installmentAppsIn, installmentRegion } from "@outlayr/money/institution-map";
import type { Locale } from "@outlayr/shared/i18n";
import { getIntlayer } from "intlayer";
import type { ReactNode } from "react";

import { AppFragment, SCREEN, useReplica } from "./canvas";
import type { AppTheme, CanvasProps } from "./canvas";
import { SystemText } from "./chrome";
import { LogScreen } from "./log";
import { appTranslator, interpolate } from "./strings";

const PANEL = { bottom: 775.33, padBottom: 10, padTop: 10.67, radius: 32, right: 382.33, width: 250.67 } as const;
const ROW = { chevronEnd: 40, end: 20, inset: 11, start: 64.33 } as const;
const ICON = { center: 40.33, size: 20, stroke: 1.5 } as const;
const CHEVRON_END = 27.33;
const LABEL = { leading: 20, size: 17 } as const;
const HINT = { leading: 18.33, lift: -1.33, size: 13, sink: 1 } as const;
const NAMED_APPS = 3;
const REGION = { de: "DE", en: "US", es: "VE", fr: "FR", pt: "BR" } as const satisfies Record<Locale, string>;
const STACK = { display: "grid" } as const;
const LAYER = { gridArea: "1 / 1" } as const;

const PALETTE = {
    dark: {
        edge: "rgba(0, 0, 0, 0.85)",
        fill: "#36332c",
        hint: "#8d8a83",
        ink: "#ffffff",
        rimBottom: "rgba(255, 255, 255, 0.18)",
        rimTop: "rgba(255, 255, 255, 0.3)",
        shadow: "rgba(0, 0, 0, 0.3)",
    },
    light: {
        edge: "rgba(0, 0, 0, 0.3)",
        fill: "#faf7f2",
        hint: "#8e8b85",
        ink: "#000000",
        rimBottom: "#ffffff",
        rimTop: "#ffffff",
        shadow: "rgba(0, 0, 0, 0.11)",
    },
} as const satisfies Record<AppTheme, Record<string, string>>;

interface MenuRow {
    description?: string;
    glyph: ReactNode;
    label: string;
    submenu?: boolean;
}

const GLYPH_STROKE = 1.67;

function ArrowsLeftRight() {
    return (
        <svg fill="none" height={19.67} viewBox="0 0 16 19.67" width={16}>
            <path
                d="M15.17 5.17H0.83M5.17 0.84L0.83 5.17L5.17 9.5M0.83 14.84H15.17M11.17 10.84L15.17 14.84L11.17 18.84"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={GLYPH_STROKE}
            />
        </svg>
    );
}

function SquarePencil() {
    return (
        <svg fill="none" height={17.33} viewBox="-1.67 0 18 17.33" width={18}>
            <path
                d="M10.97 2.83H3.7A3 3 0 0 0 0.7 5.83V12.2A3 3 0 0 0 3.7 15.2H11A3 3 0 0 0 14 12.2V5.6"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth={1.4}
            />
            <path d="M5.6 10.9L7.24 10.42L14.51 2.91L13.35 1.75L6.08 9.26Z" fill="currentColor" />
            <circle cx={15.5} cy={0.85} fill="currentColor" r={0.85} />
        </svg>
    );
}

const huge = (icon: IconSvgElement) => (
    <HugeiconsIcon color="currentColor" icon={icon} size={ICON.size} strokeWidth={ICON.stroke} />
);

function menuRows(locale: Locale): MenuRow[] {
    const t = appTranslator(locale);
    const apps = installmentAppsIn(installmentRegion(REGION[locale]))
        .slice(0, NAMED_APPS)
        .map((app) => app.label);
    return [
        { description: t("log.add.moreHint"), glyph: huge(Wallet01Icon), label: t("log.add.more"), submenu: true },
        {
            description: t("log.add.transferHint"),
            glyph: <ArrowsLeftRight />,
            label: t("log.add.transfer"),
        },
        { glyph: huge(Mic01Icon), label: t("log.add.voice") },
        { glyph: huge(ScanIcon), label: t("log.add.scan") },
        {
            description:
                apps.length > 0
                    ? t("log.add.installmentsApps", { apps: apps.join(", ") })
                    : t("log.add.installmentsAny"),
            glyph: huge(ShoppingCart01Icon),
            label: t("accounts.add.installments"),
        },
        { glyph: <SquarePencil />, label: t("log.add.transaction") },
    ];
}

function Chevron({ ink }: { ink: string }) {
    return (
        <svg fill="none" height={10.67} viewBox="0 0 6.33 10.67" width={6.33}>
            <path
                d="M1 1L5.33 5.33L1 9.67"
                stroke={ink}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.9}
            />
        </svg>
    );
}

function MenuItem({ row }: { row: MenuRow }) {
    const { theme } = useReplica();
    const palette = PALETTE[theme];
    return (
        <div
            style={{
                paddingBlock: ROW.inset,
                paddingInlineEnd: row.submenu ? ROW.chevronEnd : ROW.end,
                paddingInlineStart: ROW.start,
            }}
        >
            <div
                className="absolute inset-y-0 items-center justify-center"
                style={{ left: ICON.center - ICON.size / 2, width: ICON.size }}
            >
                {row.glyph}
            </div>
            <SystemText
                size={LABEL.size}
                style={{ lineHeight: `${LABEL.leading}px`, textWrap: "balance", whiteSpace: "normal" }}
                weight={400}
            >
                {row.label}
            </SystemText>
            {row.description === undefined ? null : (
                <div style={{ color: palette.hint, marginBottom: HINT.lift, marginTop: HINT.sink }}>
                    <SystemText
                        size={HINT.size}
                        style={{ lineHeight: `${HINT.leading}px`, whiteSpace: "normal" }}
                        weight={400}
                    >
                        {row.description}
                    </SystemText>
                </div>
            )}
            {row.submenu ? (
                <div className="absolute inset-y-0 justify-center" style={{ right: CHEVRON_END }}>
                    <Chevron ink={palette.ink} />
                </div>
            ) : null}
        </div>
    );
}

function AddMenu({ rows }: { rows: readonly MenuRow[] }) {
    const { theme } = useReplica();
    const palette = PALETTE[theme];
    return (
        <div
            className="absolute"
            style={{
                background: palette.fill,
                borderRadius: PANEL.radius,
                bottom: SCREEN.height - PANEL.bottom,
                boxShadow: [
                    `0 0 0 0.33px ${palette.edge}`,
                    `inset 0 0 0 0.33px ${palette.edge}`,
                    `0 6px 40px ${palette.shadow}`,
                    `inset 0 1px 1.33px ${palette.rimTop}`,
                    `inset 0 -1px 1.33px ${palette.rimBottom}`,
                ].join(", "),
                color: palette.ink,
                paddingBottom: PANEL.padBottom,
                paddingTop: PANEL.padTop,
                right: SCREEN.width - PANEL.right,
                width: PANEL.width,
            }}
        >
            {rows.map((row) => (
                <MenuItem key={row.label} row={row} />
            ))}
        </div>
    );
}

export function AddMenuScreen({ className, ...canvas }: CanvasProps) {
    const rows = menuRows(canvas.locale);
    const label = interpolate(getIntlayer("appUi", canvas.locale).labels.entryAddMenu, {
        items: rows.map((row) => row.label).join(", "),
    });
    return (
        <div className={className} style={STACK}>
            <div aria-hidden style={LAYER}>
                <LogScreen {...canvas} />
            </div>
            <div style={LAYER}>
                <AppFragment {...canvas} height={SCREEN.height} label={label} width={SCREEN.width}>
                    <AddMenu rows={rows} />
                </AppFragment>
            </div>
        </div>
    );
}
