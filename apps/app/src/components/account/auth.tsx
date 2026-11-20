import ViewIcon from "@hugeicons/core-free-icons/ViewIcon";
import ViewOffIcon from "@hugeicons/core-free-icons/ViewOffIcon";
import { Field } from "panelui-web/field";
import { Input } from "panelui-web/input";
import type { InputProps } from "panelui-web/input";
import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { DashboardShot } from "@/components/dashboard-shot";
import { Brand } from "@/components/logo-mark";
import { IconButton } from "@/components/ui/icon-button";

export function AuthSplit({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
    return (
        <div className="app-shell bg-background text-foreground grid min-h-dvh lg:grid-cols-[600px_minmax(0,1fr)]">
            <div className="flex flex-col px-10 max-sm:px-4">
                <Brand className="h-16 shrink-0" />
                <main className="m-auto w-full max-w-90 py-8">{children}</main>
                <div className="flex min-h-16 shrink-0 items-center py-4">{footer}</div>
            </div>
            <DashboardShot alt="" />
        </div>
    );
}

export function AuthHead({ body, title }: { body?: ReactNode; title: ReactNode }) {
    return (
        <div className="mb-6">
            <h1 className="text-app-figure font-semibold tracking-tight">{title}</h1>
            {body ? <p className="text-muted-foreground text-app-label mt-1.5">{body}</p> : null}
        </div>
    );
}

export function PasswordField({
    error,
    label,
    ...input
}: Omit<InputProps, "type"> & { error?: ReactNode; label: ReactNode }) {
    const copy = useIntlayer("sign-in");
    const [shown, setShown] = useState(false);
    return (
        <Field invalid={Boolean(error)}>
            <Field.Label>{label}</Field.Label>
            <Input.Group>
                <Input {...input} type={shown ? "text" : "password"} />
                <Input.Addon align="end">
                    <IconButton
                        className="text-muted-foreground"
                        icon={shown ? ViewOffIcon : ViewIcon}
                        label={shown ? copy.hide.value : copy.show.value}
                        onClick={() => setShown(!shown)}
                        size="sm"
                    />
                </Input.Addon>
            </Input.Group>
            {error ? <Field.Error match>{error}</Field.Error> : null}
        </Field>
    );
}

export const CODE_LENGTH = 6;
const NON_DIGITS = /\D/gu;
const SLOTS = Array.from({ length: CODE_LENGTH }, (_, slot) => slot);

export function CodeField({
    disabled = false,
    error,
    onChange,
    value,
}: {
    disabled?: boolean;
    error?: ReactNode;
    onChange: (code: string) => void;
    value: string;
}) {
    const copy = useIntlayer("sign-in");
    const [focused, setFocused] = useState(false);
    const active = Math.min(value.length, CODE_LENGTH - 1);
    const slotTone = (slot: number) => {
        if (error) {
            return "border-destructive";
        }
        return focused && slot === active ? "border-ring ring-ring/30 ring-3" : "border-input";
    };
    return (
        <div className="mb-5">
            <div className={`relative flex gap-2 ${disabled ? "text-muted-foreground opacity-60" : ""}`}>
                {SLOTS.map((slot) => (
                    <span
                        className={`bg-background dark:bg-input/30 rounded-app-md text-app-heading flex h-12 flex-1 items-center justify-center border font-mono font-medium shadow-xs ${slotTone(slot)}`}
                        key={slot}
                    >
                        {value.charAt(slot)}
                    </span>
                ))}
                <input
                    aria-invalid={error ? true : undefined}
                    aria-label={copy.code.value}
                    autoComplete="one-time-code"
                    autoFocus
                    className="absolute inset-0 w-full cursor-text opacity-0 disabled:cursor-default"
                    disabled={disabled}
                    inputMode="numeric"
                    maxLength={CODE_LENGTH}
                    onBlur={() => setFocused(false)}
                    onChange={(event) => onChange(event.target.value.replaceAll(NON_DIGITS, "").slice(0, CODE_LENGTH))}
                    onFocus={() => setFocused(true)}
                    value={value}
                />
            </div>
            {error ? (
                <p className="text-destructive text-app-label mt-2" role="alert">
                    {error}
                </p>
            ) : null}
        </div>
    );
}

export function Divider({ children }: { children: ReactNode }) {
    return (
        <p className="text-muted-foreground text-app-caption before:bg-border after:bg-border my-4 flex items-center gap-3 before:h-px before:flex-1 after:h-px after:flex-1">
            {children}
        </p>
    );
}
