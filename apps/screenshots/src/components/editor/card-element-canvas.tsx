"use client";
import { img } from "@/lib/image-cache";
import { pickText } from "@/lib/locale";
import type { CardElement } from "@/lib/types";

const CARD_BASE_WIDTH = 330;

const DEFAULT_ICON_BACKGROUND = "#c2371b";


export function CardElementCanvas({ element, locale, cW }: { element: CardElement; locale: string; cW: number }) {
  const k = cW / CARD_BASE_WIDTH;
  switch (element.variant) {
    case "notification":
      return <NotificationCard element={element} locale={locale} k={k} />;
    case "bubble":
      return <BubbleCard element={element} locale={locale} k={k} />;
    default:
      return <StatCard element={element} locale={locale} k={k} />;
  }
}

function CardIcon({
  element,
  size,
  k,
  showWhenEmpty,
}: {
  element: CardElement;
  size: number;
  k: number;
  showWhenEmpty: boolean;
}) {
  const icon = element.iconSrc ? img(element.iconSrc) : undefined;
  if (!element.iconSrc && !showWhenEmpty) return null;
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 8 * k,
        background: element.iconBackground || DEFAULT_ICON_BACKGROUND,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {icon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={icon}
          alt=""
          draggable={false}
          style={{ display: "block", width: "57%", height: "57%", objectFit: "contain" }}
        />
      )}
    </div>
  );
}

function StatCard({ element, locale, k }: { element: CardElement; locale: string; k: number }) {
  const label = pickText(element.label, locale);
  const title = pickText(element.title, locale);
  const body = pickText(element.body, locale);
  return (
    <div
      style={{
        width: "100%",
        minHeight: "100%",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: 10 * k,
        background: "#17150f",
        color: "#ffffff",
        borderRadius: 20 * k,
        padding: `${14 * k}px ${16 * k}px`,
        boxShadow: `0 ${20 * k}px ${34 * k}px ${-12 * k}px #17150f80`,
      }}
    >
      <CardIcon element={element} size={30 * k} k={k} showWhenEmpty={false} />
      <div style={{ display: "flex", flexDirection: "column", gap: 2 * k, minWidth: 0 }}>
        {label && (
          <span
            style={{
              fontSize: 9.5 * k,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              lineHeight: 1.2,
              opacity: 0.6,
            }}
          >
            {label}
          </span>
        )}
        {title && (
          // With an icon the card names a thing ("Netflix $22.99"), so the title steps down from a big figure.
          <span
            style={{ fontSize: (element.iconSrc ? 16 : 28) * k, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.1 }}
          >
            {title}
          </span>
        )}
        {body && (
          <span style={{ fontSize: 11 * k, fontWeight: 700, lineHeight: 1.3, opacity: 0.7 }}>{body}</span>
        )}
      </div>
    </div>
  );
}

function NotificationCard({ element, locale, k }: { element: CardElement; locale: string; k: number }) {
  const title = pickText(element.title, locale);
  const meta = pickText(element.meta, locale);
  const body = pickText(element.body, locale);
  return (
    <div
      style={{
        width: "100%",
        minHeight: "100%",
        boxSizing: "border-box",
        display: "flex",
        gap: 9 * k,
        alignItems: "flex-start",
        background: "rgba(255,255,255,0.85)",
        color: "#17150f",
        borderRadius: 18 * k,
        padding: `${10 * k}px ${11 * k}px`,
      }}
    >
      <CardIcon element={element} size={28 * k} k={k} showWhenEmpty />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 * k }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 * k }}>
          {title && <span style={{ fontSize: 11.5 * k, fontWeight: 900, lineHeight: 1.2 }}>{title}</span>}
          {meta && (
            <span style={{ fontSize: 10 * k, fontWeight: 600, color: "#7a756b", whiteSpace: "nowrap" }}>
              {meta}
            </span>
          )}
        </div>
        {body && <span style={{ fontSize: 11 * k, fontWeight: 600, lineHeight: 1.3 }}>{body}</span>}
      </div>
    </div>
  );
}

function BubbleCard({ element, locale, k }: { element: CardElement; locale: string; k: number }) {
  const body = pickText(element.body, locale);
  return (
    <div
      style={{
        width: "100%",
        minHeight: "100%",
        boxSizing: "border-box",
        background: "#ffffff",
        color: "#17150f",
        borderRadius: `${20 * k}px ${20 * k}px ${20 * k}px ${6 * k}px`,
        padding: `${12 * k}px ${15 * k}px`,
        boxShadow: `0 ${12 * k}px ${22 * k}px ${-8 * k}px #17150f40`,
      }}
    >
      {body && <span style={{ fontSize: 17 * k, fontWeight: 900, lineHeight: 1.15, whiteSpace: "pre-line" }}>{body}</span>}
    </div>
  );
}
