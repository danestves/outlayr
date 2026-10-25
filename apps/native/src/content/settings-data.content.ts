import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const settingsData = {
    content: {
        "settings.deleted.deletedOn": t({
            en: "Deleted {date}",
            es: "Eliminada {date}",
            pt: "Apagado {date}",
        }),
        "settings.deleted.empty": t({
            en: "Nothing has been deleted. Entries you delete arrive here and wait. Outlayr never throws one away.",
            es: "No has eliminado nada. Las entradas que elimines llegan aquí y te esperan. Outlayr nunca descarta ninguna.",
            pt: "Nada foi apagado. Os lançamentos que você apagar chegam aqui e ficam esperando. O Outlayr nunca joga nenhum fora.",
        }),
        "settings.deleted.failedBody": t({
            en: "It is still here and nothing was lost. Try restoring it again.",
            es: "Sigue aquí y no se perdió nada. Intenta restaurarla de nuevo.",
            pt: "Ele continua aqui e nada se perdeu. Tente restaurá-lo de novo.",
        }),
        "settings.deleted.failedTitle": t({
            en: "Entry not restored",
            es: "La entrada no se restauró",
            pt: "O lançamento não foi restaurado",
        }),
        "settings.deleted.footer": t({
            en: "Restoring puts the entry back on the Log exactly where its date belongs. A subscription you ended stays ended: only the charge comes back, never the schedule.",
            es: "Restaurar devuelve la entrada al registro justo donde le corresponde por fecha. Una suscripción que terminaste sigue terminada: vuelve solo el cargo, nunca la programación.",
            pt: "Restaurar coloca o lançamento de volta na aba Lançamentos, bem no lugar da data dele. Uma assinatura que você encerrou continua encerrada: só a cobrança volta, nunca a programação.",
        }),
        "settings.deleted.navTitle": t({
            en: "Recently deleted",
            es: "Eliminados recientemente",
            pt: "Apagados recentemente",
        }),
        "settings.deleted.restore": t({
            en: "Restore",
            es: "Restaurar",
            pt: "Restaurar",
        }),
        "settings.deleted.restoreEntry": t({
            en: "Restore {note}",
            es: "Restaurar {note}",
            pt: "Restaurar {note}",
        }),
        "settings.deleted.section": t({
            en: "Deleted entries",
            es: "Entradas eliminadas",
            pt: "Lançamentos apagados",
        }),
        "settings.erase.action": t({
            en: "Erase",
            es: "Borrar",
            pt: "Apagar",
        }),
        "settings.erase.confirmEverythingBody": t({
            en: "Every transaction, recurring template, transfer, budget and photo will be deleted. Your accounts, categories, savings goals, tags and settings are kept. This can't be undone.",
            es: "Se eliminarán todas las transacciones, plantillas recurrentes, transferencias, presupuestos y fotos. Tus cuentas, categorías, metas de ahorro, etiquetas y configuración se conservan. Esto no se puede deshacer.",
            pt: "Todos os lançamentos, modelos recorrentes, transferências, orçamentos e fotos serão apagados. Suas contas, categorias, metas de economia, tags e ajustes são mantidos. Isso não pode ser desfeito.",
        }),
        "settings.erase.confirmEverythingTitle": t({
            en: "Erase everything?",
            es: "¿Borrar todo?",
            pt: "Apagar tudo?",
        }),
        "settings.erase.confirmTransactionsBody": t({
            en: "Every transaction and recurring template will be deleted. Budgets and categories are kept. This can't be undone.",
            es: "Se eliminarán todas las transacciones y plantillas recurrentes. Los presupuestos y las categorías se conservan. Esto no se puede deshacer.",
            pt: "Todos os lançamentos e modelos recorrentes serão apagados. Orçamentos e categorias são mantidos. Isso não pode ser desfeito.",
        }),
        "settings.erase.confirmTransactionsTitle": t({
            en: "Erase transactions?",
            es: "¿Borrar las transacciones?",
            pt: "Apagar os lançamentos?",
        }),
        "settings.erase.failedBody": t({
            en: "Part of your data may still be on this device. Try erasing again.",
            es: "Parte de tus datos podría seguir en este dispositivo. Intenta borrar de nuevo.",
            pt: "Parte dos seus dados pode continuar neste dispositivo. Tente apagar de novo.",
        }),
        "settings.erase.failedTitle": t({
            en: "Erase didn't finish",
            es: "El borrado no terminó",
            pt: "Não deu para apagar tudo",
        }),
        "settings.erase.footer": t({
            en: "Your categories are kept either way: they are the vocabulary you built, not the records you logged.",
            es: "Tus categorías se conservan en ambos casos: son el vocabulario que armaste, no los registros que anotaste.",
            pt: "Suas categorias são mantidas nos dois casos: são o vocabulário que você criou, não os registros que você fez.",
        }),
        "settings.erase.onThisDevice": t({
            en: "On this device",
            es: "En este dispositivo",
            pt: "Neste dispositivo",
        }),
        "settings.erase.section": t({
            en: "Erase",
            es: "Borrar",
            pt: "Apagar",
        }),
        "settings.erase.transactionLogged": t({
            en: "transaction logged",
            es: "transacción registrada",
            pt: "lançamento registrado",
        }),
        "settings.erase.transactionsAndBudgets": t({
            en: "Transactions and budgets",
            es: "Transacciones y presupuestos",
            pt: "Lançamentos e orçamentos",
        }),
        "settings.erase.transactionsLogged": t({
            en: "transactions logged",
            es: "transacciones registradas",
            pt: "lançamentos registrados",
        }),
        "settings.erase.transactionsOnly": t({
            en: "Transactions only",
            es: "Solo las transacciones",
            pt: "Só os lançamentos",
        }),
        "settings.export.action": t({
            en: "Export CSV",
            es: "Exportar CSV",
            pt: "Exportar CSV",
        }),
        "settings.export.archiveAction": t({
            en: "Export a full archive",
            es: "Exportar un archivo completo",
            pt: "Exportar um arquivo completo",
        }),
        "settings.export.archiveNote": t({
            en: "Carries every entry, category and budget in full, including the things the CSV leaves behind. This is the file to restore from.",
            es: "Incluye cada registro, categoría y presupuesto completos, con todo lo que el CSV deja fuera. Es el archivo que usas para restaurar.",
            pt: "Inclui cada lançamento, categoria e orçamento por completo, com tudo o que o CSV deixa de fora. É deste arquivo que você restaura.",
        }),
        "settings.export.archiveShareTitle": t({
            en: "Outlayr archive",
            es: "Archivo de Outlayr",
            pt: "Arquivo do Outlayr",
        }),
        "settings.export.archiveTitle": t({
            en: "Full archive",
            es: "Archivo completo",
            pt: "Arquivo completo",
        }),
        "settings.export.columns": t({
            en: "Columns",
            es: "Columnas",
            pt: "Colunas",
        }),
        "settings.export.columnsNote": t({
            en: "Dates are ISO 8601 instants and amounts are plain decimals with no grouping, so the file reads back into Outlayr (or into a spreadsheet) as the same figures.",
            es: "Las fechas van en formato ISO 8601 y los montos como decimales simples sin separador de miles, así que el archivo se vuelve a leer en Outlayr (o en una hoja de cálculo) con las mismas cifras.",
            pt: "As datas vão no formato ISO 8601 e os valores como decimais simples, sem separador de milhar, então o arquivo volta para o Outlayr (ou para uma planilha) com os mesmos números.",
        }),
        "settings.export.failedBody": t({
            en: "The file couldn't be written.",
            es: "No se pudo escribir el archivo.",
            pt: "Não foi possível gravar o arquivo.",
        }),
        "settings.export.failedTitle": t({
            en: "Export failed",
            es: "Error al exportar",
            pt: "Falha ao exportar",
        }),
        "settings.export.footer": t({
            en: "Deleted transactions are left out. Every other transaction is written, newest first, in eight columns.",
            es: "Las transacciones eliminadas se omiten. Todas las demás se escriben, de la más reciente a la más antigua, en ocho columnas.",
            pt: "Os lançamentos apagados ficam de fora. Todos os outros são gravados, do mais recente ao mais antigo, em oito colunas.",
        }),
        "settings.export.omitted": t({
            en: "Not in the file",
            es: "No está en el archivo",
            pt: "Fora do arquivo",
        }),
        "settings.export.omittedDetails": t({
            en: "Notes: the longer text under a transaction",
            es: "Notas: el texto largo debajo de una transacción",
            pt: "Notas: o texto mais longo abaixo de um lançamento",
        }),
        "settings.export.omittedLook": t({
            en: "Emoji, icon and color",
            es: "Emoji, ícono y color",
            pt: "Emoji, ícone e cor",
        }),
        "settings.export.omittedNote": t({
            en: "A CSV is a readable copy of your figures, not a backup. Reading one back in re-creates only the date, name, amount, currency and type of each transaction, and links each one to the category with the same name, because the file cannot create a category. Your budgets, your categories and everything listed above live only on this device.",
            es: "Un CSV es una copia legible de tus cifras, no un respaldo. Al volver a importarlo solo se recrean la fecha, el nombre, el monto, la moneda y el tipo de cada transacción, y vincula cada una con la categoría del mismo nombre, porque el archivo no puede crear categorías. Tus presupuestos, tus categorías y todo lo anterior existen únicamente en este dispositivo.",
            pt: "Um CSV é uma cópia legível dos seus números, não um backup. Ao importá-lo de volta, só a data, o nome, o valor, a moeda e o tipo de cada lançamento são recriados, e cada um é ligado à categoria de mesmo nome, porque o arquivo não pode criar categorias. Seus orçamentos, suas categorias e tudo o que está listado acima existem só neste dispositivo.",
        }),
        "settings.export.omittedPhotos": t({
            en: "Photos",
            es: "Fotos",
            pt: "Fotos",
        }),
        "settings.export.omittedRecurrence": t({
            en: "Subscription schedules and their reminders",
            es: "La programación de las suscripciones y sus recordatorios",
            pt: "A programação das assinaturas e seus lembretes",
        }),
        "settings.export.preparing": t({
            en: "Preparing the file\u2026",
            es: "Preparando el archivo\u2026",
            pt: "Preparando o arquivo…",
        }),
        "settings.export.preparingArchive": t({
            en: "Preparing the archive\u2026",
            es: "Preparando el archivo completo\u2026",
            pt: "Preparando o arquivo completo…",
        }),
        "settings.export.ready": t({
            en: "Ready to export",
            es: "Listo para exportar",
            pt: "Pronto para exportar",
        }),
        "settings.export.shareTitle": t({
            en: "Export transactions",
            es: "Exportar transacciones",
            pt: "Exportar lançamentos",
        }),
        "settings.export.transaction": t({
            en: "transaction",
            es: "transacción",
            pt: "lançamento",
        }),
        "settings.export.transactions": t({
            en: "transactions",
            es: "transacciones",
            pt: "lançamentos",
        }),
        "settings.import.sourceCsvSubtitle": t({
            en: "Comma-separated values from your bank.",
            es: "Valores separados por comas de tu banco.",
            pt: "Valores separados por vírgula, do seu banco.",
        }),
        "settings.import.sourceCsvTitle": t({
            en: "CSV file",
            es: "Archivo CSV",
            pt: "Arquivo CSV",
        }),
        "settings.restore.action": t({
            en: "Restore from an archive",
            es: "Restaurar desde un archivo",
            pt: "Restaurar de um arquivo",
        }),
        "settings.restore.badArchiveBody": t({
            en: "The file could not be read, or it was written by a newer version of the app.",
            es: "No se pudo leer el archivo, o lo escribió una versión más reciente de la app.",
            pt: "Não foi possível ler o arquivo, ou ele foi gravado por uma versão mais nova do app.",
        }),
        "settings.restore.badArchiveTitle": t({
            en: "That is not an Outlayr archive",
            es: "Ese no es un archivo de Outlayr",
            pt: "Esse não é um arquivo do Outlayr",
        }),
        "settings.restore.confirmAction": t({
            en: "Replace",
            es: "Reemplazar",
            pt: "Substituir",
        }),
        "settings.restore.confirmBody": t({
            en: "Everything on this device is replaced by the {count} rows in the archive. This cannot be undone.",
            es: "Todo lo de este dispositivo se reemplaza por las {count} filas del archivo. Esto no se puede deshacer.",
            pt: "Tudo neste dispositivo é substituído pelas {count} linhas do arquivo. Isso não pode ser desfeito.",
        }),
        "settings.restore.confirmTitle": t({
            en: "Replace this ledger?",
            es: "¿Reemplazar este registro?",
            pt: "Substituir estes lançamentos?",
        }),
        "settings.restore.eyebrow": t({
            en: "Restore everything",
            es: "Restaurar todo",
            pt: "Restaurar tudo",
        }),
        "settings.restore.failedBody": t({
            en: "That file couldn't be opened.",
            es: "No se pudo abrir ese archivo.",
            pt: "Não foi possível abrir esse arquivo.",
        }),
        "settings.restore.failedTitle": t({
            en: "Restore failed",
            es: "Error al restaurar",
            pt: "Falha ao restaurar",
        }),
        "settings.restore.footer": t({
            en: "This replaces every transaction, category and budget on this device. It cannot be undone.",
            es: "Esto reemplaza cada transacción, categoría y presupuesto de este dispositivo. No se puede deshacer.",
            pt: "Isso substitui cada lançamento, categoria e orçamento deste dispositivo. Não pode ser desfeito.",
        }),
        "settings.restore.intro": t({
            en: "A full archive replaces this ledger with the one in the file. Use it to move to a new phone, not to add entries.",
            es: "Un archivo completo reemplaza este registro por el del archivo. Sirve para pasarte a un celular nuevo, no para agregar registros.",
            pt: "Um arquivo completo substitui estes lançamentos pelos do arquivo. Serve para passar para um celular novo, não para adicionar lançamentos.",
        }),
        "settings.restore.restoring_one": t({
            en: "Restoring {count} row\u2026",
            es: "Restaurando {count} fila\u2026",
            pt: "Restaurando {count} linha…",
        }),
        "settings.restore.restoring_other": t({
            en: "Restoring {count} rows\u2026",
            es: "Restaurando {count} filas\u2026",
            pt: "Restaurando {count} linhas…",
        }),
    },
    key: "settings-data" as const,
} satisfies Dictionary;

export default settingsData;
