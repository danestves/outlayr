import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboard = {
    content: {
        account: {
            label: t({ en: "Account", es: "Cuenta" }),
            signOut: t({ en: "Sign out", es: "Cerrar sesión" }),
        },
        add: {
            hint: t({
                en: "Add entries on your phone and they show up here.",
                es: "Añade movimientos en tu teléfono y aparecen aquí.",
            }),
            label: t({ en: "Add", es: "Añadir" }),
        },
        filters: {
            accounts: t({ en: "accounts", es: "cuentas" }),
            allAccounts: t({ en: "All accounts", es: "Todas las cuentas" }),
            category: insert(t({ en: "{{name}} filter", es: "Filtro {{name}}" })),
            removeCategory: insert(t({ en: "Remove {{name}} filter", es: "Quitar filtro {{name}}" })),
        },
        nav: {
            dashboard: t({ en: "Dashboard", es: "Panel" }),
            home: t({ en: "Outlayr home", es: "Inicio de Outlayr" }),
            insights: t({ en: "Insights", es: "Estadísticas" }),
            label: t({ en: "Ledger", es: "Libro" }),
        },
    },
    key: "dashboard",
} satisfies Dictionary;

export default dashboard;
