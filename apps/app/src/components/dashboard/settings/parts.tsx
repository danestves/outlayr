import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import { Link, useRouteContext } from "@tanstack/react-router";
import { ChoiceCards } from "panelui-web/choice-cards";
import { Frame } from "panelui-web/frame";
import { Label } from "panelui-web/label";
import { Switch } from "panelui-web/switch";
import { Tabs } from "panelui-web/tabs";
import { useToast } from "panelui-web/toast";
import { useId } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { IconButton } from "@/components/ui/icon-button";
import { writeSettings } from "@/lib/ledger-settings";

export function SectionHead({
    action,
    backTo = "/settings",
    title,
}: {
    action?: ReactNode;
    backTo?: "/settings" | "/settings/connections";
    title: ReactNode;
}) {
    const { sections, title: settings } = useIntlayer("dashboard-settings");
    return (
        <div className="flex min-h-16 items-center gap-2 max-lg:min-h-12">
            <IconButton
                className="-ml-2.5 lg:hidden"
                icon={ArrowLeft01Icon}
                label={backTo === "/settings/connections" ? sections.connections.value : settings.value}
                render={<Link to={backTo} />}
            />
            <h1 className="text-app-heading mr-auto shrink-0 font-semibold">{title}</h1>
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
        <Frame className="min-w-0">
            <Frame.Header>
                <Frame.Title as="h2">{title}</Frame.Title>
                {action ? <Frame.Action>{action}</Frame.Action> : null}
            </Frame.Header>
            <Frame.Panel>{children}</Frame.Panel>
            {footer ? <Frame.Footer className="text-sm">{footer}</Frame.Footer> : null}
        </Frame>
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
        <div className="border-app-rule min-h-app-row flex items-center gap-3 border-t px-4 py-2 first:border-t-0 max-sm:flex-wrap max-sm:gap-y-2">
            {leading}
            <div className="min-w-0 flex-1">
                <Label className="block" htmlFor={labelFor}>
                    {label}
                </Label>
                {hint ? <p className="text-app-body text-app-muted">{hint}</p> : null}
            </div>
            {children}
        </div>
    );
}

export function ToggleRow({
    checked,
    disabled,
    hint,
    label,
    onChange,
}: {
    checked: boolean;
    disabled?: boolean;
    hint?: ReactNode;
    label: string;
    onChange: (next: boolean) => void;
}) {
    const id = useId();
    return (
        <Row hint={hint} label={label} labelFor={id}>
            <Switch checked={checked} disabled={disabled} id={id} onCheckedChange={onChange} />
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
    options: readonly { label: ReactNode; value: Value }[];
    value: Value;
}) {
    return (
        <Tabs
            onValueChange={(next) => {
                const picked = options.find((option) => option.value === next);
                if (picked) {
                    onChange(picked.value);
                }
            }}
            value={value}
        >
            <Tabs.List aria-label={label}>
                {options.map((option) => (
                    <Tabs.Trigger key={option.value} value={option.value}>
                        {option.label}
                    </Tabs.Trigger>
                ))}
            </Tabs.List>
        </Tabs>
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

const SWATCH =
    "size-7 rounded-full p-0 data-checked:outline-current hover:not-data-checked:outline-2 hover:not-data-checked:outline-solid hover:not-data-checked:outline-current/35 [&>[data-slot=choice-cards-check]]:hidden";

export function Swatches<Value extends string>({
    className,
    label,
    onChange,
    options,
    value,
}: {
    className?: string;
    label: string;
    onChange: (next: Value) => void;
    options: readonly { color: string; label: string; value: Value }[];
    value: Value;
}) {
    return (
        <ChoiceCards
            aria-label={label}
            className={className}
            onValueChange={(next) => {
                const picked = options.find((option) => option.value === next);
                if (picked) {
                    onChange(picked.value);
                }
            }}
            value={value}
        >
            {options.map((option) => (
                <ChoiceCards.Item
                    aria-label={option.label}
                    className={SWATCH}
                    key={option.value}
                    style={{ background: option.color, color: option.color }}
                    value={option.value}
                />
            ))}
        </ChoiceCards>
    );
}
