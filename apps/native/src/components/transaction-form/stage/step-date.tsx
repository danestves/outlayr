import { DatePicker, Host } from "@expo/ui/swift-ui";
import { datePickerStyle, labelsHidden } from "@expo/ui/swift-ui/modifiers";

// A fixed box, not `matchContents`: a SwiftUI wheel reports no intrinsic height through the bridge, and an unsized
// host collapses it. Shorter than the keypad, so this step never pushes the sentence off screen.
const WHEEL_HEIGHT = 196;

interface StepDateProps {
    date: Date;
    onChange: (next: Date) => void;
    withTime?: boolean;
}

// Not `compact`: that opens a popover of its own, the presentation the stage exists to remove.
export function StepDate({ date, onChange, withTime = false }: StepDateProps) {
    return (
        <Host style={{ height: WHEEL_HEIGHT }}>
            <DatePicker
                displayedComponents={withTime ? ["date", "hourAndMinute"] : ["date"]}
                modifiers={[datePickerStyle("wheel"), labelsHidden()]}
                onDateChange={onChange}
                selection={date}
            />
        </Host>
    );
}
