import { useWhen } from "@/lib/lifecycle";

export function useLeaveWhenGone(gone: boolean, leave: () => void): void {
    useWhen(gone, () => {
        leave();
    });
}
