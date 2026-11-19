import type { CSSProperties } from "react";

import type { WatchScreenKind } from "@/components/app-ui/watch";

import { Replica } from "../replica";

const METAL = "linear-gradient(150deg, #4a4a4e 0%, #232326 38%, #161618 62%, #2e2e32 100%)";
const BAND = "linear-gradient(90deg, #141416 0%, #202023 50%, #141416 100%)";

const STRAP: CSSProperties = { background: BAND, height: "24%", left: "21%", position: "absolute", width: "58%" };

export function WatchFace({ screen = "today" }: { screen?: WatchScreenKind }) {
    return (
        <div style={{ aspectRatio: "600 / 960", position: "relative", width: "100%" }}>
            <div aria-hidden style={{ ...STRAP, borderRadius: "14% 14% 0 0 / 22% 22% 0 0", top: 0 }} />
            <div aria-hidden style={{ ...STRAP, borderRadius: "0 0 14% 14% / 0 0 22% 22%", bottom: 0 }} />
            <div
                aria-hidden
                style={{
                    background: METAL,
                    borderRadius: "22% / 38%",
                    height: "10%",
                    left: "90.6%",
                    position: "absolute",
                    top: "34%",
                    width: "6.4%",
                }}
            />
            <div
                aria-hidden
                style={{
                    background: METAL,
                    borderRadius: "30.7% / 25.9%",
                    boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.08), 0 18px 40px rgb(0 0 0 / 0.35)",
                    height: "62.75%",
                    left: "7.6%",
                    position: "absolute",
                    top: "18.6%",
                    width: "84.8%",
                }}
            />
            <div
                aria-hidden
                style={{
                    background: "#000",
                    borderRadius: "29% / 24%",
                    boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.06)",
                    height: "58.4%",
                    left: "10.8%",
                    position: "absolute",
                    top: "20.8%",
                    width: "78.4%",
                }}
            />
            <div
                style={{
                    alignItems: "center",
                    background: "#000",
                    borderRadius: "27% / 22%",
                    display: "flex",
                    height: "54%",
                    left: "14.6%",
                    overflow: "hidden",
                    position: "absolute",
                    top: "23%",
                    width: "70.8%",
                }}
            >
                <div style={{ width: "100%" }}>
                    <Replica>
                        {({ WatchScreen }, locale) => (
                            <WatchScreen fit locale={locale} screen={screen} theme="dark" withSaved />
                        )}
                    </Replica>
                </div>
            </div>
        </div>
    );
}
