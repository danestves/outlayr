import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const settingsControls = {
    content: {
        "settings.controls.credits": t({
            en: "Credits",
            es: "Créditos",
            fr: "Crédits",
            pt: "Créditos",
        }),
        "settings.controls.export": t({
            en: "Export",
            es: "Exportar",
            fr: "Exporter",
            pt: "Exportar",
        }),
        "settings.controls.import": t({
            en: "Import",
            es: "Importar",
            fr: "Importer",
            pt: "Importar",
        }),
        "settings.controls.preview": t({
            en: "Preview",
            es: "Vista previa",
            fr: "Aperçu",
            pt: "Prévia",
            "pt-PT": "Pré-visualização",
        }),
        "settings.controls.restore": t({
            en: "Restore backup",
            es: "Restaurar copia",
            fr: "Restaurer une sauvegarde",
            pt: "Restaurar backup",
            "pt-PT": "Restaurar cópia de segurança",
        }),
    },
    key: "settings-controls" as const,
} satisfies Dictionary;

export default settingsControls;
