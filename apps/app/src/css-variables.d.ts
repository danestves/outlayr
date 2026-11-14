import "react";

declare module "react" {
    interface CSSProperties {
        [variable: `--${string}`]: number | string;
    }
}
