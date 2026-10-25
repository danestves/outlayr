import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const settingsData = {
    content: {
        "settings.deleted.deletedOn": t({
            en: "Deleted {date}",
            es: "Eliminada {date}",
        }),
        "settings.deleted.empty": t({
            en: "Nothing has been deleted. Entries you delete arrive here and wait. Outlayr never throws one away.",
            es: "No has eliminado nada. Las entradas que elimines llegan aquí y te esperan. Outlayr nunca descarta ninguna.",
        }),
        "settings.deleted.failedBody": t({
            en: "It is still here and nothing was lost. Try restoring it again.",
            es: "Sigue aquí y no se perdió nada. Intenta restaurarla de nuevo.",
        }),
        "settings.deleted.failedTitle": t({
            en: "Entry not restored",
            es: "La entrada no se restauró",
        }),
        "settings.deleted.footer": t({
            en: "Restoring puts the entry back on the Log exactly where its date belongs. A subscription you ended stays ended: only the charge comes back, never the schedule.",
            es: "Restaurar devuelve la entrada al registro justo donde le corresponde por fecha. Una suscripción que terminaste sigue terminada: vuelve solo el cargo, nunca la programación.",
        }),
        "settings.deleted.navTitle": t({
            en: "Recently deleted",
            es: "Eliminados recientemente",
        }),
        "settings.deleted.restore": t({
            en: "Restore",
            es: "Restaurar",
        }),
        "settings.deleted.restoreEntry": t({
            en: "Restore {note}",
            es: "Restaurar {note}",
        }),
        "settings.deleted.section": t({
            en: "Deleted entries",
            es: "Entradas eliminadas",
        }),
        "settings.erase.action": t({
            en: "Erase",
            es: "Borrar",
        }),
        "settings.erase.confirmEverythingBody": t({
            en: "Every transaction, recurring template, transfer, budget and photo will be deleted. Your accounts, categories, savings goals, tags and settings are kept. This can't be undone.",
            es: "Se eliminarán todas las transacciones, plantillas recurrentes, transferencias, presupuestos y fotos. Tus cuentas, categorías, metas de ahorro, etiquetas y configuración se conservan. Esto no se puede deshacer.",
        }),
        "settings.erase.confirmEverythingTitle": t({
            en: "Erase everything?",
            es: "¿Borrar todo?",
        }),
        "settings.erase.confirmTransactionsBody": t({
            en: "Every transaction and recurring template will be deleted. Budgets and categories are kept. This can't be undone.",
            es: "Se eliminarán todas las transacciones y plantillas recurrentes. Los presupuestos y las categorías se conservan. Esto no se puede deshacer.",
        }),
        "settings.erase.confirmTransactionsTitle": t({
            en: "Erase transactions?",
            es: "¿Borrar las transacciones?",
        }),
        "settings.erase.failedBody": t({
            en: "Part of your data may still be on this device. Try erasing again.",
            es: "Parte de tus datos podría seguir en este dispositivo. Intenta borrar de nuevo.",
        }),
        "settings.erase.failedTitle": t({
            en: "Erase didn't finish",
            es: "El borrado no terminó",
        }),
        "settings.erase.footer": t({
            en: "Your categories are kept either way: they are the vocabulary you built, not the records you logged.",
            es: "Tus categorías se conservan en ambos casos: son el vocabulario que armaste, no los registros que anotaste.",
        }),
        "settings.erase.onThisDevice": t({
            en: "On this device",
            es: "En este dispositivo",
        }),
        "settings.erase.section": t({
            en: "Erase",
            es: "Borrar",
        }),
        "settings.erase.transactionLogged": t({
            en: "transaction logged",
            es: "transacción registrada",
        }),
        "settings.erase.transactionsAndBudgets": t({
            en: "Transactions and budgets",
            es: "Transacciones y presupuestos",
        }),
        "settings.erase.transactionsLogged": t({
            en: "transactions logged",
            es: "transacciones registradas",
        }),
        "settings.erase.transactionsOnly": t({
            en: "Transactions only",
            es: "Solo las transacciones",
        }),
        "settings.export.action": t({
            en: "Export CSV",
            es: "Exportar CSV",
        }),
        "settings.export.archiveAction": t({
            en: "Export a full archive",
            es: "Exportar un archivo completo",
        }),
        "settings.export.archiveNote": t({
            en: "Carries every entry, category and budget in full, including the things the CSV leaves behind. This is the file to restore from.",
            es: "Incluye cada registro, categoría y presupuesto completos, con todo lo que el CSV deja fuera. Es el archivo que usas para restaurar.",
        }),
        "settings.export.archiveShareTitle": t({
            en: "Outlayr archive",
            es: "Archivo de Outlayr",
        }),
        "settings.export.archiveTitle": t({
            en: "Full archive",
            es: "Archivo completo",
        }),
        "settings.export.columns": t({
            en: "Columns",
            es: "Columnas",
        }),
        "settings.export.columnsNote": t({
            en: "Dates are ISO 8601 instants and amounts are plain decimals with no grouping, so the file reads back into Outlayr (or into a spreadsheet) as the same figures.",
            es: "Las fechas van en formato ISO 8601 y los montos como decimales simples sin separador de miles, así que el archivo se vuelve a leer en Outlayr (o en una hoja de cálculo) con las mismas cifras.",
        }),
        "settings.export.failedBody": t({
            en: "The file couldn't be written.",
            es: "No se pudo escribir el archivo.",
        }),
        "settings.export.failedTitle": t({
            en: "Export failed",
            es: "Error al exportar",
        }),
        "settings.export.footer": t({
            en: "Deleted transactions are left out. Every other transaction is written, newest first, in eight columns.",
            es: "Las transacciones eliminadas se omiten. Todas las demás se escriben, de la más reciente a la más antigua, en ocho columnas.",
        }),
        "settings.export.omitted": t({
            en: "Not in the file",
            es: "No está en el archivo",
        }),
        "settings.export.omittedDetails": t({
            en: "Notes: the longer text under a transaction",
            es: "Notas: el texto largo debajo de una transacción",
        }),
        "settings.export.omittedLook": t({
            en: "Emoji, icon and color",
            es: "Emoji, ícono y color",
        }),
        "settings.export.omittedNote": t({
            en: "A CSV is a readable copy of your figures, not a backup. Reading one back in re-creates only the date, name, amount, currency and type of each transaction, and links each one to the category with the same name, because the file cannot create a category. Your budgets, your categories and everything listed above live only on this device.",
            es: "Un CSV es una copia legible de tus cifras, no un respaldo. Al volver a importarlo solo se recrean la fecha, el nombre, el monto, la moneda y el tipo de cada transacción, y vincula cada una con la categoría del mismo nombre, porque el archivo no puede crear categorías. Tus presupuestos, tus categorías y todo lo anterior existen únicamente en este dispositivo.",
        }),
        "settings.export.omittedPhotos": t({
            en: "Photos",
            es: "Fotos",
        }),
        "settings.export.omittedRecurrence": t({
            en: "Subscription schedules and their reminders",
            es: "La programación de las suscripciones y sus recordatorios",
        }),
        "settings.export.preparing": t({
            en: "Preparing the file\u2026",
            es: "Preparando el archivo\u2026",
        }),
        "settings.export.preparingArchive": t({
            en: "Preparing the archive\u2026",
            es: "Preparando el archivo completo\u2026",
        }),
        "settings.export.ready": t({
            en: "Ready to export",
            es: "Listo para exportar",
        }),
        "settings.export.shareTitle": t({
            en: "Export transactions",
            es: "Exportar transacciones",
        }),
        "settings.export.transaction": t({
            en: "transaction",
            es: "transacción",
        }),
        "settings.export.transactions": t({
            en: "transactions",
            es: "transacciones",
        }),
        "settings.import.sourceCsvSubtitle": t({
            en: "Comma-separated values from your bank.",
            es: "Valores separados por comas de tu banco.",
        }),
        "settings.import.sourceCsvTitle": t({
            en: "CSV file",
            es: "Archivo CSV",
        }),
        "settings.restore.action": t({
            en: "Restore from an archive",
            es: "Restaurar desde un archivo",
        }),
        "settings.restore.badArchiveBody": t({
            en: "The file could not be read, or it was written by a newer version of the app.",
            es: "No se pudo leer el archivo, o lo escribió una versión más reciente de la app.",
        }),
        "settings.restore.badArchiveTitle": t({
            en: "That is not an Outlayr archive",
            es: "Ese no es un archivo de Outlayr",
        }),
        "settings.restore.confirmAction": t({
            en: "Replace",
            es: "Reemplazar",
        }),
        "settings.restore.confirmBody": t({
            en: "Everything on this device is replaced by the {count} rows in the archive. This cannot be undone.",
            es: "Todo lo de este dispositivo se reemplaza por las {count} filas del archivo. Esto no se puede deshacer.",
        }),
        "settings.restore.confirmTitle": t({
            en: "Replace this ledger?",
            es: "¿Reemplazar este registro?",
        }),
        "settings.restore.eyebrow": t({
            en: "Restore everything",
            es: "Restaurar todo",
        }),
        "settings.restore.failedBody": t({
            en: "That file couldn't be opened.",
            es: "No se pudo abrir ese archivo.",
        }),
        "settings.restore.failedTitle": t({
            en: "Restore failed",
            es: "Error al restaurar",
        }),
        "settings.restore.footer": t({
            en: "This replaces every transaction, category and budget on this device. It cannot be undone.",
            es: "Esto reemplaza cada transacción, categoría y presupuesto de este dispositivo. No se puede deshacer.",
        }),
        "settings.restore.intro": t({
            en: "A full archive replaces this ledger with the one in the file. Use it to move to a new phone, not to add entries.",
            es: "Un archivo completo reemplaza este registro por el del archivo. Sirve para pasarte a un celular nuevo, no para agregar registros.",
        }),
        "settings.restore.restoring_one": t({
            en: "Restoring {count} row\u2026",
            es: "Restaurando {count} fila\u2026",
        }),
        "settings.restore.restoring_other": t({
            en: "Restoring {count} rows\u2026",
            es: "Restaurando {count} filas\u2026",
        }),
    },
    key: "settings-data" as const,
} satisfies Dictionary;

export default settingsData;
