import { createToaster } from "panelui-web/toast";

// Held outside React: useToast() subscribes its caller, and subscribing the screen loops the renderer.
export const importToasts = createToaster();
