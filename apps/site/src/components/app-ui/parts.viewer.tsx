import { AppScreen } from "./canvas";
import type { CanvasProps } from "./canvas";
import { Button, HomeIndicator, LinkRow, ScopeChip, SettingsSection, Sheet, ToggleRow } from "./parts";

function PartsScreen(canvas: CanvasProps) {
    return (
        <AppScreen {...canvas} label="Replica parts">
            <Sheet title="New">
                <div style={{ padding: "80px 20px 0" }}>
                    <div className="flex-row gap-2">
                        <ScopeChip menu title="This month" />
                        <ScopeChip clearable title="Groceries" />
                    </div>
                    <SettingsSection title="Money">
                        <LinkRow title="Currency" value="USD" />
                        <ToggleRow on title="Income tracking" />
                        <ToggleRow on={false} title="Show cents" />
                    </SettingsSection>
                </div>
                <div style={{ bottom: 34, left: 20, position: "absolute", right: 20 }}>
                    <Button className="rounded-full" size="lg">
                        Sign in
                    </Button>
                </div>
            </Sheet>
            <HomeIndicator />
        </AppScreen>
    );
}

export const screens = { parts: PartsScreen };
