import { Outlet, createFileRoute } from "@tanstack/react-router";
import { Toast } from "panelui-web/toast";

import { importToasts } from "@/components/dashboard/import/toasts";

export const Route = createFileRoute("/_account/app/import")({ component: Import });

function Import() {
    return (
        <Toast.Provider position="bottom-center" toastManager={importToasts}>
            <Outlet />
        </Toast.Provider>
    );
}
