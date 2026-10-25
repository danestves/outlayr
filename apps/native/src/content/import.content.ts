import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const importSheet = {
    content: {
        "import.chooseCsv": t({
            en: "Choose CSV",
            es: "Elegir CSV",
        }),
        "import.chooseDifferentFile": t({
            en: "Choose a different file",
            es: "Elegir otro archivo",
        }),
        "import.declinedBody": t({
            en: "AI suggestions are off in Settings.",
            es: "Las sugerencias de IA están desactivadas en Configuración.",
        }),
        "import.doneAddedLabel": t({
            en: "Added",
            es: "Agregadas",
        }),
        "import.doneStamp": t({
            en: "Imported · {count} rows",
            es: "Importado · {count} filas",
        }),
        "import.doneSubline": t({
            en: "{count} duplicates skipped · {month} is on the Log",
            es: "{count} duplicados omitidos · {month} ya está en el registro",
        }),
        "import.doneSublineNoDuplicates": t({
            en: "{month} is on the Log",
            es: "{month} ya está en el registro",
        }),
        "import.errorEmptyBody": t({
            en: "We couldn't find any comma-separated data in this file.",
            es: "No encontramos datos separados por comas en este archivo.",
        }),
        "import.errorEmptyTitle": t({
            en: "This doesn't look like a CSV file",
            es: "Esto no parece un archivo CSV",
        }),
        "import.errorIoTitle": t({
            en: "We couldn't read that file",
            es: "No pudimos leer ese archivo",
        }),
        "import.errorNoDataBody": t({
            en: "This file has a header row but no data below it.",
            es: "Este archivo tiene encabezados, pero no hay datos debajo.",
        }),
        "import.errorNoDataTitle": t({
            en: "No transactions found in this file",
            es: "No se encontraron transacciones en este archivo",
        }),
        "import.errorTooFewColumnsBody": t({
            en: "Outlayr needs at least a date, an amount, and a category or description column.",
            es: "Outlayr necesita al menos una fecha, un monto y una columna de categoría o descripción.",
        }),
        "import.errorTooFewColumnsTitle": t({
            en: "This file has fewer than 3 columns",
            es: "Este archivo tiene menos de 3 columnas",
        }),
        "import.errorTooLargeBody": t({
            en: "Try exporting a smaller date range from your bank.",
            es: "Intenta exportar un rango de fechas más pequeño desde tu banco.",
        }),
        "import.errorTooLargeTitle": t({
            en: "This file is too large to open",
            es: "Este archivo es demasiado grande para abrirlo",
        }),
        "import.fileColumnsLabel": t({
            en: "Columns",
            es: "Columnas",
        }),
        "import.fileDatesLabel": t({
            en: "Dates",
            es: "Fechas",
        }),
        "import.fileEmptyCaption": t({
            en: "No file chosen",
            es: "Ningún archivo elegido",
        }),
        "import.fileNoCategoryColumn": t({
            en: "No category column — we'll read the Description column instead.",
            es: "No hay columna de categoría, así que vamos a leer la columna Descripción.",
        }),
        "import.fileOnDeviceNote": t({
            en: "Large files are read on your device only.",
            es: "Los archivos grandes se leen solo en tu dispositivo.",
        }),
        "import.fileReadOnDevice": t({
            en: "Read on this device",
            es: "Leído en este dispositivo",
        }),
        "import.fileRowsLabel": t({
            en: "Rows",
            es: "Filas",
        }),
        "import.mappingGapGuidance": t({
            en: "Add a header row that names the missing column, or choose a file that already has one.",
            es: "Agrega una fila de encabezado que nombre la columna faltante, o elige un archivo que ya la tenga.",
        }),
        "import.mappingGapNoAmount": t({
            en: "No amount column",
            es: "No hay columna de monto",
        }),
        "import.mappingGapNoDate": t({
            en: "No date column",
            es: "No hay columna de fecha",
        }),
        "import.mappingGapNoLabel": t({
            en: "No description or category column",
            es: "No hay columna de descripción o categoría",
        }),
        "import.mappingGapTitle": t({
            en: "We couldn't find the right columns",
            es: "No pudimos encontrar las columnas correctas",
        }),
        "import.openFeatureLab": t({
            en: "Open Feature Lab",
            es: "Abrir Laboratorio de funciones",
        }),
        "import.readingFile": t({
            en: "Reading the file…",
            es: "Leyendo el archivo…",
        }),
        "import.resolveDetailMatched": t({
            en: "{matched} of {total} merchants",
            es: "{matched} de {total} comercios",
        }),
        "import.resolveDetailNothingSent": t({
            en: "Nothing left your device",
            es: "Nada salió de tu dispositivo",
        }),
        "import.resolveDetailRows": t({
            en: "{count} rows read",
            es: "{count} filas leídas",
        }),
        "import.resolveDetailSent": t({
            en: "{count} merchant names sent",
            es: "{count} nombres de comercios enviados",
        }),
        "import.resolveFootnote": t({
            en: "Only unmatched merchant names and your category names are sent — never your amounts, dates, or the file itself.",
            es: "Solo se envían los nombres de comercios sin coincidencia y los de tus categorías. Nunca tus montos, fechas ni el archivo.",
        }),
        "import.resolveReviewCta": t({
            en: "Review {count} transactions",
            es: "Revisar {count} transacciones",
        }),
        "import.resolveRunningAsked": t({
            en: "Asked the model",
            es: "Consultamos al modelo",
        }),
        "import.resolveRunningMatched": t({
            en: "Matched on device",
            es: "Buscamos coincidencias en el dispositivo",
        }),
        "import.resolveRunningReadFile": t({
            en: "Read the file",
            es: "Leímos el archivo",
        }),
        "import.resumeBody": t({
            en: "Your file and progress were kept.",
            es: "Tu archivo y tu progreso quedaron guardados.",
        }),
        "import.resumeNotice": t({
            en: "Picking up where you left off",
            es: "Continuamos donde lo dejaste",
        }),
        "import.reviewCommitConfirmCta": t({
            en: "Import {count} transactions?",
            es: "¿Importar {count} transacciones?",
        }),
        "import.reviewCommitCta": t({
            en: "Import {count} transactions",
            es: "Importar {count} transacciones",
        }),
        "import.reviewCommitFailedBody": t({
            en: "The write failed, so your ledger is unchanged. Your selections are still here.",
            es: "No se pudo guardar, así que tu registro no cambió. Tus selecciones siguen aquí.",
        }),
        "import.reviewCommitFailedTitle": t({
            en: "Nothing was imported",
            es: "No se importó nada",
        }),
        "import.reviewCommitting_one": t({
            en: "Importing {count} transaction…",
            es: "Importando {count} transacción…",
        }),
        "import.reviewCommitting_other": t({
            en: "Importing {count} transactions…",
            es: "Importando {count} transacciones…",
        }),
        "import.reviewDuplicateCaption": t({
            en: "Looks already imported.",
            es: "Parece que ya se importó.",
        }),
        "import.reviewEmptyTitle": t({
            en: "Nothing to import",
            es: "Nada para importar",
        }),
        "import.reviewSkippedHide": t({
            en: "{count} rows skipped · Hide",
            es: "{count} filas omitidas · Ocultar",
        }),
        "import.reviewSkippedShow": t({
            en: "{count} rows skipped · Show",
            es: "{count} filas omitidas · Mostrar",
        }),
        "import.reviewToImportLabel": t({
            en: "To import",
            es: "Para importar",
        }),
        "import.reviewToImportValue": t({
            en: "{count} of {total}",
            es: "{count} de {total}",
        }),
        "import.skipReasonAmount": t({
            en: "Unreadable amount",
            es: "Monto ilegible",
        }),
        "import.skipReasonCategory": t({
            en: "No matching category",
            es: "Sin categoría coincidente",
        }),
        "import.skipReasonDate": t({
            en: "Unreadable date",
            es: "Fecha ilegible",
        }),
        "import.skipReasonRate": t({
            en: "Invalid exchange-rate metadata",
            es: "Metadatos de tasa de cambio no válidos",
        }),
        "import.sourceEyebrow": t({
            en: "Bring data in",
            es: "Trae tus datos",
        }),
        "import.sourceLede": t({
            en: "Bring transactions in from a file. Everything is read on your device.",
            es: "Trae transacciones desde un archivo. Todo se lee en tu dispositivo.",
        }),
        "import.startOver": t({
            en: "Start over",
            es: "Empezar de nuevo",
        }),
        "import.titleDone": t({
            en: "Imported",
            es: "Importado",
        }),
        "import.titleFile": t({
            en: "Choose a file",
            es: "Elige un archivo",
        }),
        "import.titleResolve": t({
            en: "Preparing",
            es: "Preparando",
        }),
        "import.titleReview": t({
            en: "Review",
            es: "Revisar",
        }),
        "import.titleSource": t({
            en: "Import",
            es: "Importar",
        }),
        "import.tryAgain": t({
            en: "Try again",
            es: "Intentar de nuevo",
        }),
        "import.unavailableInvalidResponse": t({
            en: "We didn't understand the answer, so we ignored all of it.",
            es: "No entendimos la respuesta, así que la ignoramos por completo.",
        }),
        "import.unavailableNoEntries": t({
            en: "None of its rows matched one of your categories on your device.",
            es: "Ninguna de sus filas coincidió con una de tus categorías en tu dispositivo.",
        }),
        "import.unavailableNotConfigured": t({
            en: "Not configured yet.",
            es: "Aún no está configurado.",
        }),
        "import.unavailableNotEntitled": t({
            en: "AI suggestions are part of Pro.",
            es: "Las sugerencias con IA son parte de Pro.",
        }),
        "import.unavailableOffline": t({
            en: "You're offline.",
            es: "Estás sin conexión.",
        }),
        "import.unavailableOverCap": t({
            en: "This file is too large to send, so it was read on your device only.",
            es: "Este archivo es demasiado grande para enviarlo, así que se leyó solo en tu dispositivo.",
        }),
        "import.unavailableProviderError": t({
            en: "The service didn't answer.",
            es: "El servicio no respondió.",
        }),
        "import.unavailableRateLimited": t({
            en: "Too many imports this hour.",
            es: "Hiciste demasiadas importaciones en esta hora.",
        }),
        "import.unavailableTimeout": t({
            en: "It took too long.",
            es: "Tardó demasiado.",
        }),
        "import.unavailableTitle": t({
            en: "Suggestions are unavailable",
            es: "Las sugerencias no están disponibles",
        }),
        "import.unavailableUnauthenticated": t({
            en: "Sign in to get AI suggestions.",
            es: "Inicia sesión para obtener sugerencias de IA.",
        }),
    },
    key: "import" as const,
} satisfies Dictionary;

export default importSheet;
