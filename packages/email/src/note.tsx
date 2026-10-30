import { render } from "@react-email/render";
import type { CSSProperties, ReactElement, ReactNode } from "react";

import type { Language } from "./language";

const INK = "#17150f";
const MUTED = "#6b6557";
const RULE = "#dcd8cc";
const TINT = "#c2371b";
const SYSTEM_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO_FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const MARK_URL = "https://tryoutlayr.com/apple-touch-icon.png";
const PREVIEW_LENGTH = 200;
const PREVIEW_FILL = " ‌​‍﻿";

const GREETING = { en: "Hi,", es: "Hola,", fr: "Bonjour,", pt: "Olá," } satisfies Record<Language, string>;
const COLON = { en: ": ", es: ": ", fr: " : ", pt: ": " } satisfies Record<Language, string>;

const presentation = { border: 0, cellPadding: 0, cellSpacing: 0, role: "presentation", width: "100%" } as const;
const paragraph: CSSProperties = { color: INK, fontSize: 16, lineHeight: "25px", margin: "0 0 16px" };
const cell: CSSProperties = {
    borderTop: `1px solid ${RULE}`,
    fontSize: 14,
    lineHeight: "20px",
    padding: "9px 0",
    verticalAlign: "top",
};

function Text({ children, style }: { children: ReactNode; style?: CSSProperties }) {
    return <p style={{ ...paragraph, ...style }}>{children}</p>;
}

export interface NoteItem {
    detail?: string;
    label: string;
}

export interface NoteProps {
    after: string;
    facts: readonly (readonly [string, string])[];
    footer: string;
    intro: string;
    items: readonly NoteItem[];
    language: Language;
    lead: string;
    link?: { href: string; label: string };
    preview: string;
}

export function Note({ after, facts, footer, intro, items, language, lead, link, preview }: NoteProps) {
    const previewText = preview.slice(0, PREVIEW_LENGTH);
    return (
        <html dir="ltr" lang={language}>
            <head>
                <meta content="text/html; charset=UTF-8" httpEquiv="Content-Type" />
                <meta name="x-apple-disable-message-reformatting" />
                <meta content="light" name="color-scheme" />
                <meta content="light" name="supported-color-schemes" />
                <title>{previewText}</title>
            </head>
            <body style={{ backgroundColor: "#ffffff", margin: 0 }}>
                <div
                    data-skip-in-text
                    style={{
                        display: "none",
                        lineHeight: "1px",
                        maxHeight: 0,
                        maxWidth: 0,
                        opacity: 0,
                        overflow: "hidden",
                    }}
                >
                    {previewText}
                    {PREVIEW_FILL.repeat(PREVIEW_LENGTH - previewText.length)}
                </div>
                <table {...presentation} align="center" style={{ fontFamily: SYSTEM_FONT, maxWidth: 520 }}>
                    <tbody>
                        <tr>
                            <td style={{ padding: "32px 24px 28px" }}>
                                <img
                                    alt="Outlayr"
                                    height={28}
                                    src={MARK_URL}
                                    style={{ border: "none", borderRadius: 7, display: "block", margin: "0 0 28px" }}
                                    width={28}
                                />
                                <Text>{GREETING[language]}</Text>
                                <Text>{lead}</Text>
                                {facts.length > 0 ? (
                                    <table
                                        {...presentation}
                                        data-text-format="dataTable"
                                        style={{ borderBottom: `1px solid ${RULE}`, margin: "0 0 20px" }}
                                    >
                                        <tbody>
                                            {facts.map(([key, value]) => (
                                                <tr key={key}>
                                                    <td style={{ ...cell, color: MUTED, width: "40%" }}>{key}</td>
                                                    <td
                                                        style={{
                                                            ...cell,
                                                            color: INK,
                                                            fontFamily: MONO_FONT,
                                                            fontSize: 13,
                                                        }}
                                                    >
                                                        {value}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : null}
                                <Text>{intro}</Text>
                                {items.map((item) => (
                                    <Text
                                        key={item.label}
                                        style={{ margin: "0 0 6px", paddingLeft: 16, textIndent: -16 }}
                                    >
                                        •&nbsp;&nbsp;<strong>{item.label}</strong>
                                        {item.detail ? `${COLON[language]}${item.detail}` : null}
                                    </Text>
                                ))}
                                {link ? (
                                    <Text style={{ margin: "16px 0" }}>
                                        <a
                                            href={link.href}
                                            style={{ color: TINT, textDecoration: "underline" }}
                                            target="_blank"
                                        >
                                            {link.label}
                                        </a>
                                    </Text>
                                ) : null}
                                <Text style={{ marginTop: link ? 0 : 16 }}>{after}</Text>
                                <Text style={{ margin: "24px 0 0" }}>Daniel</Text>
                                <Text style={{ color: MUTED, margin: "0 0 28px" }}>Outlayr</Text>
                                <Text style={{ color: MUTED, fontSize: 12, lineHeight: "18px", margin: 0 }}>
                                    {footer}
                                </Text>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </body>
        </html>
    );
}

export interface Email {
    html: string;
    subject: string;
    text: string;
}

export const renderEmail = async (subject: string, element: ReactElement): Promise<Email> => ({
    html: await render(element),
    subject,
    text: await render(element, { plainText: true }),
});
