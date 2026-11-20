const SHOT =
    "border-app-strong rounded-app-xl pointer-events-none absolute top-24 left-14 w-330 max-w-none border select-none";

export function DashboardShot({ alt }: { alt: string }) {
    return (
        <div className="border-border bg-card relative overflow-hidden border-l max-lg:hidden">
            <img
                alt={alt}
                className={`${SHOT} dark:hidden`}
                decoding="async"
                height={880}
                loading="lazy"
                src="/onboarding-light.webp"
                width={1320}
            />
            <img
                alt={alt}
                className={`${SHOT} not-dark:hidden`}
                decoding="async"
                height={880}
                loading="lazy"
                src="/onboarding-dark.webp"
                width={1320}
            />
        </div>
    );
}
