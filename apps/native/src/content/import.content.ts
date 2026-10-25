import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const importSheet = {
    content: {
        "import.chooseCsv": t({
            en: "Choose CSV",
            es: "Elegir CSV",
            pt: "Escolher CSV",
        }),
        "import.chooseDifferentFile": t({
            en: "Choose a different file",
            es: "Elegir otro archivo",
            pt: "Escolher outro arquivo",
        }),
        "import.declinedBody": t({
            en: "AI suggestions are off in Settings.",
            es: "Las sugerencias de IA están desactivadas en Configuración.",
            pt: "As sugestões de IA estão desativadas em Ajustes.",
        }),
        "import.doneAddedLabel": t({
            en: "Added",
            es: "Agregadas",
            pt: "Adicionados",
        }),
        "import.doneStamp": t({
            en: "Imported · {count} rows",
            es: "Importado · {count} filas",
            pt: "Importado · {count} linhas",
        }),
        "import.doneSubline": t({
            en: "{count} duplicates skipped · {month} is on the Log",
            es: "{count} duplicados omitidos · {month} ya está en el registro",
            pt: "{count} duplicados ignorados · {month} já está em Lançamentos",
        }),
        "import.doneSublineNoDuplicates": t({
            en: "{month} is on the Log",
            es: "{month} ya está en el registro",
            pt: "{month} já está em Lançamentos",
        }),
        "import.errorEmptyBody": t({
            en: "We couldn't find any comma-separated data in this file.",
            es: "No encontramos datos separados por comas en este archivo.",
            pt: "Não encontramos dados separados por vírgula neste arquivo.",
        }),
        "import.errorEmptyTitle": t({
            en: "This doesn't look like a CSV file",
            es: "Esto no parece un archivo CSV",
            pt: "Isto não parece um arquivo CSV",
        }),
        "import.errorIoTitle": t({
            en: "We couldn't read that file",
            es: "No pudimos leer ese archivo",
            pt: "Não conseguimos ler esse arquivo",
        }),
        "import.errorNoDataBody": t({
            en: "This file has a header row but no data below it.",
            es: "Este archivo tiene encabezados, pero no hay datos debajo.",
            pt: "Este arquivo tem cabeçalho, mas nenhum dado abaixo dele.",
        }),
        "import.errorNoDataTitle": t({
            en: "No transactions found in this file",
            es: "No se encontraron transacciones en este archivo",
            pt: "Nenhum lançamento encontrado neste arquivo",
        }),
        "import.errorTooFewColumnsBody": t({
            en: "Outlayr needs at least a date, an amount, and a category or description column.",
            es: "Outlayr necesita al menos una fecha, un monto y una columna de categoría o descripción.",
            pt: "O Outlayr precisa de pelo menos uma data, um valor e uma coluna de categoria ou descrição.",
        }),
        "import.errorTooFewColumnsTitle": t({
            en: "This file has fewer than 3 columns",
            es: "Este archivo tiene menos de 3 columnas",
            pt: "Este arquivo tem menos de 3 colunas",
        }),
        "import.errorTooLargeBody": t({
            en: "Try exporting a smaller date range from your bank.",
            es: "Intenta exportar un rango de fechas más pequeño desde tu banco.",
            pt: "Tente exportar um período menor do seu banco.",
        }),
        "import.errorTooLargeTitle": t({
            en: "This file is too large to open",
            es: "Este archivo es demasiado grande para abrirlo",
            pt: "Este arquivo é grande demais para abrir",
        }),
        "import.fileColumnsLabel": t({
            en: "Columns",
            es: "Columnas",
            pt: "Colunas",
        }),
        "import.fileDatesLabel": t({
            en: "Dates",
            es: "Fechas",
            pt: "Datas",
        }),
        "import.fileEmptyCaption": t({
            en: "No file chosen",
            es: "Ningún archivo elegido",
            pt: "Nenhum arquivo escolhido",
        }),
        "import.fileNoCategoryColumn": t({
            en: "No category column — we'll read the Description column instead.",
            es: "No hay columna de categoría, así que vamos a leer la columna Descripción.",
            pt: "Sem coluna de categoria, então vamos ler a coluna Descrição.",
        }),
        "import.fileOnDeviceNote": t({
            en: "Large files are read on your device only.",
            es: "Los archivos grandes se leen solo en tu dispositivo.",
            pt: "Arquivos grandes são lidos só no seu dispositivo.",
        }),
        "import.fileReadOnDevice": t({
            en: "Read on this device",
            es: "Leído en este dispositivo",
            pt: "Lido neste dispositivo",
        }),
        "import.fileRowsLabel": t({
            en: "Rows",
            es: "Filas",
            pt: "Linhas",
        }),
        "import.mappingGapGuidance": t({
            en: "Add a header row that names the missing column, or choose a file that already has one.",
            es: "Agrega una fila de encabezado que nombre la columna faltante, o elige un archivo que ya la tenga.",
            pt: "Adicione uma linha de cabeçalho com o nome da coluna que falta, ou escolha um arquivo que já tenha uma.",
        }),
        "import.mappingGapNoAmount": t({
            en: "No amount column",
            es: "No hay columna de monto",
            pt: "Sem coluna de valor",
        }),
        "import.mappingGapNoDate": t({
            en: "No date column",
            es: "No hay columna de fecha",
            pt: "Sem coluna de data",
        }),
        "import.mappingGapNoLabel": t({
            en: "No description or category column",
            es: "No hay columna de descripción o categoría",
            pt: "Sem coluna de descrição ou categoria",
        }),
        "import.mappingGapTitle": t({
            en: "We couldn't find the right columns",
            es: "No pudimos encontrar las columnas correctas",
            pt: "Não encontramos as colunas certas",
        }),
        "import.openFeatureLab": t({
            en: "Open Feature Lab",
            es: "Abrir Laboratorio de funciones",
            pt: "Abrir Laboratório de recursos",
        }),
        "import.readingFile": t({
            en: "Reading the file…",
            es: "Leyendo el archivo…",
            pt: "Lendo o arquivo…",
        }),
        "import.resolveDetailMatched": t({
            en: "{matched} of {total} merchants",
            es: "{matched} de {total} comercios",
            pt: "{matched} de {total} estabelecimentos",
        }),
        "import.resolveDetailNothingSent": t({
            en: "Nothing left your device",
            es: "Nada salió de tu dispositivo",
            pt: "Nada saiu do seu dispositivo",
        }),
        "import.resolveDetailRows": t({
            en: "{count} rows read",
            es: "{count} filas leídas",
            pt: "{count} linhas lidas",
        }),
        "import.resolveDetailSent": t({
            en: "{count} merchant names sent",
            es: "{count} nombres de comercios enviados",
            pt: "{count} nomes de estabelecimentos enviados",
        }),
        "import.resolveFootnote": t({
            en: "Only unmatched merchant names and your category names are sent — never your amounts, dates, or the file itself.",
            es: "Solo se envían los nombres de comercios sin coincidencia y los de tus categorías. Nunca tus montos, fechas ni el archivo.",
            pt: "Só enviamos os nomes de estabelecimentos sem correspondência e os nomes das suas categorias. Nunca seus valores, datas ou o próprio arquivo.",
        }),
        "import.resolveReviewCta": t({
            en: "Review {count} transactions",
            es: "Revisar {count} transacciones",
            pt: "Revisar {count} lançamentos",
        }),
        "import.resolveRunningAsked": t({
            en: "Asked the model",
            es: "Consultamos al modelo",
            pt: "Consultamos o modelo",
        }),
        "import.resolveRunningMatched": t({
            en: "Matched on device",
            es: "Buscamos coincidencias en el dispositivo",
            pt: "Comparamos no dispositivo",
        }),
        "import.resolveRunningReadFile": t({
            en: "Read the file",
            es: "Leímos el archivo",
            pt: "Lemos o arquivo",
        }),
        "import.resumeBody": t({
            en: "Your file and progress were kept.",
            es: "Tu archivo y tu progreso quedaron guardados.",
            pt: "Seu arquivo e seu progresso foram mantidos.",
        }),
        "import.resumeNotice": t({
            en: "Picking up where you left off",
            es: "Continuamos donde lo dejaste",
            pt: "Continuando de onde você parou",
        }),
        "import.reviewCommitConfirmCta": t({
            en: "Import {count} transactions?",
            es: "¿Importar {count} transacciones?",
            pt: "Importar {count} lançamentos?",
        }),
        "import.reviewCommitCta": t({
            en: "Import {count} transactions",
            es: "Importar {count} transacciones",
            pt: "Importar {count} lançamentos",
        }),
        "import.reviewCommitFailedBody": t({
            en: "The write failed, so your ledger is unchanged. Your selections are still here.",
            es: "No se pudo guardar, así que tu registro no cambió. Tus selecciones siguen aquí.",
            pt: "A gravação falhou, então seus lançamentos não mudaram. Suas seleções continuam aqui.",
        }),
        "import.reviewCommitFailedTitle": t({
            en: "Nothing was imported",
            es: "No se importó nada",
            pt: "Nada foi importado",
        }),
        "import.reviewCommitting_one": t({
            en: "Importing {count} transaction…",
            es: "Importando {count} transacción…",
            pt: "Importando {count} lançamento…",
        }),
        "import.reviewCommitting_other": t({
            en: "Importing {count} transactions…",
            es: "Importando {count} transacciones…",
            pt: "Importando {count} lançamentos…",
        }),
        "import.reviewDuplicateCaption": t({
            en: "Looks already imported.",
            es: "Parece que ya se importó.",
            pt: "Parece que já foi importado.",
        }),
        "import.reviewEmptyTitle": t({
            en: "Nothing to import",
            es: "Nada para importar",
            pt: "Nada para importar",
        }),
        "import.reviewSkippedHide": t({
            en: "{count} rows skipped · Hide",
            es: "{count} filas omitidas · Ocultar",
            pt: "{count} linhas ignoradas · Ocultar",
        }),
        "import.reviewSkippedShow": t({
            en: "{count} rows skipped · Show",
            es: "{count} filas omitidas · Mostrar",
            pt: "{count} linhas ignoradas · Mostrar",
        }),
        "import.reviewToImportLabel": t({
            en: "To import",
            es: "Para importar",
            pt: "Para importar",
        }),
        "import.reviewToImportValue": t({
            en: "{count} of {total}",
            es: "{count} de {total}",
            pt: "{count} de {total}",
        }),
        "import.skipReasonAmount": t({
            en: "Unreadable amount",
            es: "Monto ilegible",
            pt: "Valor ilegível",
        }),
        "import.skipReasonCategory": t({
            en: "No matching category",
            es: "Sin categoría coincidente",
            pt: "Nenhuma categoria correspondente",
        }),
        "import.skipReasonDate": t({
            en: "Unreadable date",
            es: "Fecha ilegible",
            pt: "Data ilegível",
        }),
        "import.skipReasonRate": t({
            en: "Invalid exchange-rate metadata",
            es: "Metadatos de tasa de cambio no válidos",
            pt: "Metadados de cotação inválidos",
        }),
        "import.sourceEyebrow": t({
            en: "Bring data in",
            es: "Trae tus datos",
            pt: "Traga seus dados",
        }),
        "import.sourceLede": t({
            en: "Bring transactions in from a file. Everything is read on your device.",
            es: "Trae transacciones desde un archivo. Todo se lee en tu dispositivo.",
            pt: "Traga lançamentos de um arquivo. Tudo é lido no seu dispositivo.",
        }),
        "import.startOver": t({
            en: "Start over",
            es: "Empezar de nuevo",
            pt: "Começar de novo",
        }),
        "import.titleDone": t({
            en: "Imported",
            es: "Importado",
            pt: "Importado",
        }),
        "import.titleFile": t({
            en: "Choose a file",
            es: "Elige un archivo",
            pt: "Escolha um arquivo",
        }),
        "import.titleResolve": t({
            en: "Preparing",
            es: "Preparando",
            pt: "Preparando",
        }),
        "import.titleReview": t({
            en: "Review",
            es: "Revisar",
            pt: "Revisar",
        }),
        "import.titleSource": t({
            en: "Import",
            es: "Importar",
            pt: "Importar",
        }),
        "import.tryAgain": t({
            en: "Try again",
            es: "Intentar de nuevo",
            pt: "Tentar de novo",
        }),
        "import.unavailableInvalidResponse": t({
            en: "We didn't understand the answer, so we ignored all of it.",
            es: "No entendimos la respuesta, así que la ignoramos por completo.",
            pt: "Não entendemos a resposta, então ignoramos tudo.",
        }),
        "import.unavailableNoEntries": t({
            en: "None of its rows matched one of your categories on your device.",
            es: "Ninguna de sus filas coincidió con una de tus categorías en tu dispositivo.",
            pt: "Nenhuma das linhas correspondeu a uma das suas categorias no seu dispositivo.",
        }),
        "import.unavailableNotConfigured": t({
            en: "Not configured yet.",
            es: "Aún no está configurado.",
            pt: "Ainda não configurado.",
        }),
        "import.unavailableNotEntitled": t({
            en: "AI suggestions are part of Pro.",
            es: "Las sugerencias con IA son parte de Pro.",
            pt: "As sugestões de IA fazem parte do Pro.",
        }),
        "import.unavailableOffline": t({
            en: "You're offline.",
            es: "Estás sin conexión.",
            pt: "Você está sem conexão.",
        }),
        "import.unavailableOverCap": t({
            en: "This file is too large to send, so it was read on your device only.",
            es: "Este archivo es demasiado grande para enviarlo, así que se leyó solo en tu dispositivo.",
            pt: "Este arquivo é grande demais para enviar, então foi lido só no seu dispositivo.",
        }),
        "import.unavailableProviderError": t({
            en: "The service didn't answer.",
            es: "El servicio no respondió.",
            pt: "O serviço não respondeu.",
        }),
        "import.unavailableRateLimited": t({
            en: "Too many imports this hour.",
            es: "Hiciste demasiadas importaciones en esta hora.",
            pt: "Importações demais nesta hora.",
        }),
        "import.unavailableTimeout": t({
            en: "It took too long.",
            es: "Tardó demasiado.",
            pt: "Demorou demais.",
        }),
        "import.unavailableTitle": t({
            en: "Suggestions are unavailable",
            es: "Las sugerencias no están disponibles",
            pt: "Sugestões indisponíveis",
        }),
        "import.unavailableUnauthenticated": t({
            en: "Sign in to get AI suggestions.",
            es: "Inicia sesión para obtener sugerencias de IA.",
            pt: "Entre para receber sugestões de IA.",
        }),
    },
    key: "import" as const,
} satisfies Dictionary;

export default importSheet;
