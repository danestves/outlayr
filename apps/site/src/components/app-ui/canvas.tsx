import "./app-theme.css";
import type { Locale } from "@outlayr/shared/i18n";
import { createContext, use, useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";

import { StatusBar } from "@/stageshow/phone";

import { appTranslator } from "./strings";
import type { AppT } from "./strings";

export type AppTheme = "light" | "dark";

export const SCREEN = { height: 874, width: 402 } as const;

interface Replica {
    locale: Locale;
    slot: string;
    t: AppT;
    theme: AppTheme;
}

const ReplicaContext = createContext<Replica | null>(null);

export function useReplica(): Replica {
    const replica = use(ReplicaContext);
    if (!replica) {
        throw new Error("App replica parts render inside AppFragment or AppScreen.");
    }
    return replica;
}

type CanvasStyle = CSSProperties & Record<`--app-${string}`, string | number>;

export interface AppFragmentProps {
    children: ReactNode;
    className?: string;
    fit?: boolean;
    height: number;
    label: string;
    locale: Locale;
    scale?: number;
    slot?: string;
    theme: AppTheme;
    width: number;
}

export function AppFragment({
    children,
    className,
    fit = false,
    height,
    label,
    locale,
    scale,
    slot = "",
    theme,
    width,
}: AppFragmentProps) {
    const replica = useMemo(() => ({ locale, slot, t: appTranslator(locale), theme }), [locale, slot, theme]);
    const style: CanvasStyle = { "--app-h": `${height}px`, "--app-w": `${width}px` };
    if (scale !== undefined && !fit) {
        style["--app-scale"] = scale;
    }
    const canvas = (
        <div aria-label={label} className={fit ? undefined : className} data-app-canvas="" role="img" style={style}>
            <div aria-hidden data-app-replica="" data-app-theme={theme} inert>
                <ReplicaContext value={replica}>{children}</ReplicaContext>
            </div>
        </div>
    );
    if (!fit) {
        return canvas;
    }
    return (
        <div className={className} data-app-fit="" style={{ aspectRatio: `${width} / ${height}` }}>
            {canvas}
        </div>
    );
}

export type AppScreenProps = Omit<AppFragmentProps, "height" | "width">;

export type CanvasProps = Omit<AppScreenProps, "children" | "label">;

export function AppScreen({ children, ...canvas }: AppScreenProps) {
    return (
        <AppFragment {...canvas} height={SCREEN.height} width={SCREEN.width}>
            <div className="bg-background absolute inset-0" />
            {children}
            <div className="absolute inset-x-0 top-0" data-app-status="" style={{ color: "var(--title-ink)" }}>
                <StatusBar />
            </div>
        </AppFragment>
    );
}
