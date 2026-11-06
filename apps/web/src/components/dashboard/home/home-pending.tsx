const BLOCK = "bg-muted rounded-md";

export function HomePending() {
    return (
        <div aria-hidden>
            <div className="border-border grid grid-cols-2 gap-px border-b lg:grid-cols-4">
                {[0, 1, 2, 3].map((slot) => (
                    <div className="px-5 py-3" key={slot}>
                        <div className={`${BLOCK} h-3 w-16`} />
                        <div className={`${BLOCK} mt-2 h-6 w-32`} />
                    </div>
                ))}
            </div>
            <div className="px-5 pt-4">
                <div className={`${BLOCK} h-[328px] w-full`} />
            </div>
            <div className="space-y-2 px-5 pt-6">
                {[0, 1, 2, 3, 4].map((slot) => (
                    <div className={`${BLOCK} h-7 w-full`} key={slot} />
                ))}
            </div>
        </div>
    );
}

export function HomePanelPending() {
    return (
        <div aria-hidden className="space-y-3 px-4 py-4">
            {[0, 1, 2, 3, 4, 5].map((slot) => (
                <div className={`${BLOCK} h-8 w-full`} key={slot} />
            ))}
        </div>
    );
}
