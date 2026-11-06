import type { ReactNode } from "react";

import { TopBar } from "./top-bar";

interface WorkspaceProps {
    bar?: ReactNode;
    main: ReactNode;
    panel?: ReactNode;
    title: ReactNode;
}

export function Workspace({ bar, main, panel, title }: WorkspaceProps) {
    return (
        <div className="grid min-h-dvh xl:grid-cols-[minmax(0,1fr)_356px]">
            <div className="flex min-w-0 flex-col">
                <TopBar title={title}>{bar}</TopBar>
                <div className="flex-1">{main}</div>
            </div>
            <aside className="border-border border-t xl:border-t-0 xl:border-l">{panel}</aside>
        </div>
    );
}
