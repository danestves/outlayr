import { RiArrowLeftSLine } from "@remixicon/react";
import { Link, useRouteContext } from "@tanstack/react-router";
import { Switch } from "panelui-web/switch";
import { useToast } from "panelui-web/toast";
import { useId } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { CardFrame } from "@/components/dashboard/home/card-frame";
import { writeSettings } from "@/lib/ledger-settings";

export function SectionHead({ action, title }: { action?: ReactNode; title: ReactNode }) {
    const { title: settings } = useIntlayer("dashboard-settings");
    return (
        <div className="flex min-h-16 items-center gap-2 max-lg:min-h-12">
            <Link aria-label={settings.value} className="dash-icon-btn -ml-2.5 lg:hidden" to="/app/settings">
                <RiArrowLeftSLine size={22} />
            </Link>
            <h1 className="mr-auto text-lg font-semibold tracking-[-0.02em]">{title}</h1>
            {action}
        </div>
    );
}

export function SettingsCard({
    action,
    children,
    footer,
    title,
}: {
    action?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    title: ReactNode;
}) {
    return (
        <CardFrame action={action} footer={footer} title={title}>
            {children}
        </CardFrame>
    );
}

export function Row({
    children,
    hint,
    label,
    labelFor,
    leading,
}: {
    children?: ReactNode;
    hint?: ReactNode;
    label: ReactNode;
    leading?: ReactNode;
    labelFor?: string;
}) {
    return (
        <div className="border-border flex min-h-14 items-center gap-4 border-t px-4 py-2.5 first:border-t-0 max-sm:flex-wrap max-sm:gap-y-2">
            {leading}
            <div className="min-w-0 flex-1">
                <label className="block text-sm leading-5 font-medium" htmlFor={labelFor}>
                    {label}
                </label>
                {hint ? <p className="text-muted-foreground text-[13px] leading-[18px]">{hint}</p> : null}
            </div>
            {children}
        </div>
    );
}

export function ToggleRow({
    checked,
    hint,
    label,
    onChange,
}: {
    checked: boolean;
    hint?: ReactNode;
    label: string;
    onChange: (next: boolean) => void;
}) {
    const id = useId();
    return (
        <Row hint={hint} label={label} labelFor={id}>
            <Switch checked={checked} id={id} onCheckedChange={onChange} size="sm" />
        </Row>
    );
}

export function Choice<Value extends string | number>({
    label,
    onChange,
    options,
    value,
}: {
    label: string;
    onChange: (next: Value) => void;
    options: readonly { label: string; value: Value }[];
    value: Value;
}) {
    return (
        <fieldset aria-label={label} className="bg-app-fill inline-flex shrink-0 rounded-[10px] p-[3px]">
            {options.map((option) => (
                <button
                    aria-pressed={option.value === value}
                    className="dash-seg"
                    data-on={option.value === value}
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    type="button"
                >
                    {option.label}
                </button>
            ))}
        </fieldset>
    );
}

export function useSaveSettings() {
    const { dbClient } = useRouteContext({ from: "__root__" });
    const toast = useToast();
    const { saveFailed } = useIntlayer("dashboard-settings");
    return (changes: Readonly<Record<string, string>>) => {
        writeSettings(dbClient, changes).catch(() => {
            toast.add({ title: saveFailed.value, type: "destructive" });
        });
    };
}
