import { t } from "intlayer";
import type { Dictionary } from "intlayer";

interface LocaleOverrides {
    it: string;
    nl: string;
    ja: string;
    ko: string;
    "es-ES"?: string;
    "pt-PT"?: string;
}
interface TextContent extends LocaleOverrides {
    en: string;
    de: string;
    es: string;
    fr: string;
    pt: string;
}

const text = (en: string, de: string, es: string, fr: string, pt: string, overrides: LocaleOverrides) => {
    const { it, nl, ja, ko } = overrides;
    const content: TextContent = { en, de, es, fr, pt, it, nl, ja, ko };
    if (overrides["es-ES"] !== undefined) {
        content["es-ES"] = overrides["es-ES"];
    }
    if (overrides["pt-PT"] !== undefined) {
        content["pt-PT"] = overrides["pt-PT"];
    }
    return t(content);
};

const dashboardImportMm = {
    content: {
        accounts: {
            asCard: text(
                "A new card or loan",
                "Eine neue Karte oder ein neuer Kredit",
                "Una tarjeta o préstamo nuevo",
                "Une nouvelle carte ou un prêt",
                "Um cartão ou empréstimo novo",
                {
                    it: "Una nuova carta o un prestito",
                    nl: "Een nieuwe kaart of lening",
                    ja: "新しいカードまたはローン",
                    ko: "새 카드 또는 대출",
                }
            ),
            asNew: text("A new account", "Ein neues Konto", "Una cuenta nueva", "Un nouveau compte", "Uma conta nova", {
                it: "Un nuovo conto",
                nl: "Een nieuwe rekening",
                ja: "新しい口座",
                ko: "새 계좌",
            }),
            already: text(
                "Already in Outlayr",
                "Schon in Outlayr",
                "Ya en Outlayr",
                "Déjà dans Outlayr",
                "Já no Outlayr",
                { it: "Già in Outlayr", nl: "Al in Outlayr", ja: "Outlayrに登録済み", ko: "이미 Outlayr에 있음" }
            ),
            balance: text("Balance", "Kontostand", "Saldo", "Solde", "Saldo", {
                it: "Saldo",
                nl: "Saldo",
                ja: "残高",
                ko: "잔액",
            }),
            bring: text("Bring it in as", "Importieren als", "Traer como", "Importer comme", "Trazer como", {
                it: "Importa come",
                nl: "Importeren als",
                ja: "取り込み方",
                ko: "가져올 방식",
            }),
            entries: text("Entries", "Einträge", "Movimientos", "Opérations", "Lançamentos", {
                "pt-PT": "Registos",
                it: "Movimenti",
                nl: "Transacties",
                ja: "記録",
                ko: "기록",
            }),
            goesTo: text("Goes to", "Geht nach", "Va a", "Va vers", "Vai para", {
                it: "Va a",
                nl: "Gaat naar",
                ja: "振り分け先",
                ko: "들어갈 곳",
            }),
            groupDeleted: text(
                "Deleted in Money Manager",
                "In Money Manager gelöscht",
                "Eliminadas en Money Manager",
                "Supprimés dans Money Manager",
                "Excluídas no Money Manager",
                {
                    "pt-PT": "Eliminadas no Money Manager",
                    it: "Eliminati in Money Manager",
                    nl: "Verwijderd in Money Manager",
                    ja: "Money Managerで削除済み",
                    ko: "Money Manager에서 삭제됨",
                }
            ),
            groupHidden: text(
                "Hidden in Money Manager",
                "In Money Manager ausgeblendet",
                "Ocultas en Money Manager",
                "Masqués dans Money Manager",
                "Ocultas no Money Manager",
                {
                    it: "Nascosti in Money Manager",
                    nl: "Verborgen in Money Manager",
                    ja: "Money Managerで非表示",
                    ko: "Money Manager에서 숨김",
                }
            ),
            groupOpen: text(
                "Open in Money Manager",
                "In Money Manager offen",
                "Abiertas en Money Manager",
                "Ouverts dans Money Manager",
                "Abertas no Money Manager",
                {
                    it: "Apri in Money Manager",
                    nl: "Openen in Money Manager",
                    ja: "Money Managerで開く",
                    ko: "Money Manager에서 열기",
                }
            ),
            inMm: text(
                "In Money Manager",
                "In Money Manager",
                "En Money Manager",
                "Dans Money Manager",
                "No Money Manager",
                { it: "In Money Manager", nl: "In Money Manager", ja: "Money Manager内", ko: "Money Manager 안" }
            ),
            into: text("Into {name}", "In {name}", "En {name}", "Vers {name}", "Em {name}", {
                it: "In {name}",
                nl: "Naar {name}",
                ja: "{name}に取り込む",
                ko: "{name}(으)로",
            }),
            join: text(
                "Or join another account",
                "Oder mit einem anderen Konto zusammenführen",
                "O unir a otra cuenta",
                "Ou fusionner avec un autre compte",
                "Ou juntar a outra conta",
                {
                    it: "Oppure unisci a un altro conto",
                    nl: "Of voeg samen met een andere rekening",
                    ja: "または別の口座に統合",
                    ko: "또는 다른 계좌에 합치기",
                }
            ),
            leave: text("Leave it out", "Weglassen", "Dejarla fuera", "Ne pas l'importer", "Deixar de fora", {
                it: "Escludilo",
                nl: "Laat het weg",
                ja: "除外する",
                ko: "제외하기",
            }),
            left: text("Left out", "Weggelassen", "Fuera", "Exclu", "Fora", {
                it: "Esclusi",
                nl: "Weggelaten",
                ja: "除外",
                ko: "제외됨",
            }),
            newCard: text(
                "New card or loan",
                "Neue Karte oder neuer Kredit",
                "Tarjeta o préstamo nuevo",
                "Nouvelle carte ou prêt",
                "Cartão ou empréstimo novo",
                {
                    it: "Nuova carta o prestito",
                    nl: "Nieuwe kaart of lening",
                    ja: "新しいカードまたはローン",
                    ko: "새 카드 또는 대출",
                }
            ),
            newAccount: text("New", "Neu", "Nueva", "Nouveau", "Nova", {
                it: "Nuovo",
                nl: "Nieuw",
                ja: "新規",
                ko: "새 항목",
            }),
            noAccount: text("No account", "Kein Konto", "Sin cuenta", "Sans compte", "Sem conta", {
                it: "Nessun conto",
                nl: "Geen rekening",
                ja: "口座なし",
                ko: "계좌 없음",
            }),
            note: text(
                "Each balance is checked against Money Manager once the import is done.",
                "Jeder Kontostand wird mit Money Manager abgeglichen, sobald der Import fertig ist.",
                "Cada saldo se compara con Money Manager cuando termina la importación.",
                "Chaque solde est comparé à Money Manager une fois l'import terminé.",
                "Cada saldo é conferido com o Money Manager quando a importação termina.",
                {
                    it: "Ogni saldo viene confrontato con Money Manager al termine dell'importazione.",
                    nl: "Elk saldo wordt na de import vergeleken met Money Manager.",
                    ja: "インポートが終わると、各残高をMoney Managerと照合します。",
                    ko: "가져오기가 끝나면 각 잔액을 Money Manager와 대조해요.",
                }
            ),
            orphan: text(
                "Their accounts were deleted",
                "Ihre Konten wurden gelöscht",
                "Sus cuentas fueron eliminadas",
                "Leurs comptes ont été supprimés",
                "As contas deles foram excluídas",
                {
                    "pt-PT": "As contas deles foram eliminadas",
                    it: "I loro conti sono stati eliminati",
                    nl: "Hun rekeningen zijn verwijderd",
                    ja: "口座が削除されています",
                    ko: "계좌가 삭제됐어요",
                }
            ),
            title: text("Accounts", "Konten", "Cuentas", "Comptes", "Contas", {
                it: "Conti",
                nl: "Rekeningen",
                ja: "口座",
                ko: "계좌",
            }),
        },
        balances: {
            account: text("Account", "Konto", "Cuenta", "Compte", "Conta", {
                it: "Conto",
                nl: "Rekening",
                ja: "口座",
                ko: "계좌",
            }),
            adds: text(
                "Entries add up to",
                "Einträge ergeben",
                "Los movimientos suman",
                "Les opérations totalisent",
                "Os lançamentos somam",
                {
                    "pt-PT": "Os registos somam",
                    it: "I movimenti sommano a",
                    nl: "Transacties tellen op tot",
                    ja: "記録の合計",
                    ko: "기록 합계",
                }
            ),
            match: text("Match", "Stimmt", "Igualar", "Aligner", "Igualar", {
                it: "Corrisponde",
                nl: "Klopt",
                ja: "一致",
                ko: "일치",
            }),
            note: text(
                "Each balance is checked again once the import is done.",
                "Jeder Kontostand wird noch einmal geprüft, sobald der Import fertig ist.",
                "Cada saldo se vuelve a comprobar cuando termina la importación.",
                "Chaque solde est revérifié une fois l'import terminé.",
                "Cada saldo é conferido de novo quando a importação termina.",
                {
                    it: "Ogni saldo viene ricontrollato al termine dell'importazione.",
                    nl: "Elk saldo wordt na de import opnieuw gecontroleerd.",
                    ja: "インポートが終わると、各残高をもう一度確認します。",
                    ko: "가져오기가 끝나면 각 잔액을 다시 확인해요.",
                }
            ),
            off: text("Off by", "Abweichung", "Diferencia", "Écart", "Diferença", {
                it: "Differenza",
                nl: "Verschil",
                ja: "差",
                ko: "차이",
            }),
            opens: text(
                "{name} opens at {opening}, so today it shows {shown}.",
                "{name} beginnt bei {opening}, deshalb zeigt es heute {shown}.",
                "{name} abre en {opening}, así que hoy muestra {shown}.",
                "{name} s'ouvre à {opening}, donc il affiche {shown} aujourd'hui.",
                "{name} abre em {opening}, então hoje mostra {shown}.",
                {
                    it: "{name} parte da {opening}, quindi oggi mostra {shown}.",
                    nl: "{name} begint op {opening}, dus vandaag staat er {shown}.",
                    ja: "{name}の初期残高は{opening}なので、今日は{shown}と表示されます。",
                    ko: "{name}의 초기 잔액은 {opening}이라서 오늘은 {shown}(으)로 보여요.",
                }
            ),
            opensZero: text(
                "{name} opens at zero, so today it shows {shown}.",
                "{name} beginnt bei null, deshalb zeigt es heute {shown}.",
                "{name} abre en cero, así que hoy muestra {shown}.",
                "{name} s'ouvre à zéro, donc il affiche {shown} aujourd'hui.",
                "{name} abre em zero, então hoje mostra {shown}.",
                {
                    it: "{name} parte da zero, quindi oggi mostra {shown}.",
                    nl: "{name} begint op nul, dus vandaag staat er {shown}.",
                    ja: "{name}の初期残高は0なので、今日は{shown}と表示されます。",
                    ko: "{name}의 초기 잔액은 0이라서 오늘은 {shown}(으)로 보여요.",
                }
            ),
            shows: text(
                "Money Manager shows",
                "Money Manager zeigt",
                "Money Manager muestra",
                "Money Manager affiche",
                "O Money Manager mostra",
                {
                    it: "Money Manager mostra",
                    nl: "Money Manager toont",
                    ja: "Money Managerの表示",
                    ko: "Money Manager 표시",
                }
            ),
            summary: text("{n} accounts", "{n} Konten", "{n} cuentas", "{n} comptes", "{n} contas", {
                it: "{n} conti",
                nl: "{n} rekeningen",
                ja: "{n}件の口座",
                ko: "계좌 {n}개",
            }),
            summaryOff: text("{n} off", "{n} weichen ab", "{n} con diferencia", "{n} avec écart", "{n} com diferença", {
                it: "{n} con differenze",
                nl: "{n} wijken af",
                ja: "{n}件が不一致",
                ko: "{n}개 불일치",
            }),
            title: text("Balances", "Kontostände", "Saldos", "Soldes des comptes", "Saldos", {
                it: "Saldi",
                nl: "Saldo's",
                ja: "残高",
                ko: "잔액",
            }),
        },
        bar: {
            back: text("Back", "Zurück", "Atrás", "Retour", "Voltar", {
                it: "Indietro",
                nl: "Terug",
                ja: "戻る",
                ko: "뒤로",
            }),
            cancel: text("Cancel", "Abbrechen", "Cancelar", "Annuler", "Cancelar", {
                it: "Annulla",
                nl: "Annuleren",
                ja: "キャンセル",
                ko: "취소",
            }),
            done: text("Done", "Fertig", "Listo", "Terminé", "Concluir", {
                "es-ES": "Hecho",
                it: "Fatto",
                nl: "Klaar",
                ja: "完了",
                ko: "완료",
            }),
            import: text(
                "Import {n} entries",
                "{n} Einträge importieren",
                "Importar {n} movimientos",
                "Importer {n} opérations",
                "Importar {n} lançamentos",
                {
                    "pt-PT": "Importar {n} registos",
                    it: "Importa {n} movimenti",
                    nl: "{n} transacties importeren",
                    ja: "{n}件の記録をインポート",
                    ko: "기록 {n}건 가져오기",
                }
            ),
            title: text("Money Manager", "Money Manager", "Money Manager", "Money Manager", "Money Manager", {
                it: "Money Manager",
                nl: "Money Manager",
                ja: "Money Manager",
                ko: "Money Manager",
            }),
        },
        budgets: {
            bring: text("Bring", "Importieren", "Traer", "Importer", "Trazer", {
                it: "Importa",
                nl: "Meenemen",
                ja: "取り込む",
                ko: "가져오기",
            }),
            category: text("Category", "Kategorie", "Categoría", "Catégorie", "Categoria", {
                it: "Categoria",
                nl: "Categorie",
                ja: "カテゴリ",
                ko: "카테고리",
            }),
            from: text("From", "Von", "Desde", "Depuis", "De", { it: "Da", nl: "Van", ja: "元", ko: "출처" }),
            fromLimits: text(
                "From Money Manager limits",
                "Aus den Limits von Money Manager",
                "De los límites de Money Manager",
                "Des limites de Money Manager",
                "Dos limites do Money Manager",
                {
                    it: "Dai limiti di Money Manager",
                    nl: "Uit de limieten van Money Manager",
                    ja: "Money Managerの上限から",
                    ko: "Money Manager 한도에서",
                }
            ),
            fromName: text("From {name}", "Von {name}", "Desde {name}", "Depuis {name}", "De {name}", {
                it: "Da {name}",
                nl: "Van {name}",
                ja: "{name}から",
                ko: "{name}에서",
            }),
            hint: text(
                "They start this month, so what you already spent in it counts.",
                "Sie beginnen diesen Monat, deshalb zählt, was du darin schon ausgegeben hast.",
                "Empiezan este mes, así que lo que ya gastaste cuenta.",
                "Ils démarrent ce mois-ci, donc ce que vous avez déjà dépensé compte.",
                "Começam neste mês, então o que você já gastou conta.",
                {
                    "pt-PT": "Começam neste mês, então o que já gastou conta.",
                    it: "Partono da questo mese, quindi conta quello che hai già speso.",
                    nl: "Ze beginnen deze maand, dus wat je er al in uitgaf telt mee.",
                    ja: "今月から始まるので、今月すでに使った分も含まれます。",
                    ko: "이번 달부터 시작하므로 이미 쓴 금액도 포함돼요.",
                }
            ),
            limit: text("Limit", "Limit", "Límite", "Limite", "Limite", {
                it: "Limite",
                nl: "Limiet",
                ja: "上限",
                ko: "한도",
            }),
            used: text("Spent", "Ausgegeben", "Gastado", "Dépensé", "Gasto", {
                it: "Speso",
                nl: "Uitgegeven",
                ja: "支出",
                ko: "지출",
            }),
            spent: text(
                "Spent in {month}",
                "Ausgegeben im {month}",
                "Gastado en {month}",
                "Dépensé en {month}",
                "Gasto em {month}",
                { it: "Speso a {month}", nl: "Uitgegeven in {month}", ja: "{month}の支出", ko: "{month} 지출" }
            ),
            title: text(
                "Monthly budgets",
                "Monatliche Budgets",
                "Presupuestos mensuales",
                "Budgets mensuels",
                "Orçamentos mensais",
                { it: "Budget mensili", nl: "Maandbudgetten", ja: "月ごとの予算", ko: "월별 예산" }
            ),
            total: text(
                "{n} budgets, {amount} a month",
                "{n} Budgets, {amount} im Monat",
                "{n} presupuestos, {amount} al mes",
                "{n} budgets, {amount} par mois",
                "{n} orçamentos, {amount} por mês",
                {
                    it: "{n} budget, {amount} al mese",
                    nl: "{n} budgetten, {amount} per maand",
                    ja: "予算{n}件、月{amount}",
                    ko: "예산 {n}개, 월 {amount}",
                }
            ),
        },
        categories: {
            count: text("{n} of {total}", "{n} von {total}", "{n} de {total}", "{n} sur {total}", "{n} de {total}", {
                it: "{n} di {total}",
                nl: "{n} van {total}",
                ja: "{n}/{total}",
                ko: "{total}개 중 {n}개",
            }),
            entries: text("Entries", "Einträge", "Movimientos", "Opérations", "Lançamentos", {
                "pt-PT": "Registos",
                it: "Movimenti",
                nl: "Transacties",
                ja: "記録",
                ko: "기록",
            }),
            expenses: text("Expenses", "Ausgaben", "Gastos", "Dépenses", "Despesas", {
                it: "Spese",
                nl: "Uitgaven",
                ja: "支出",
                ko: "지출",
            }),
            goesTo: text("Goes to", "Geht nach", "Va a", "Va vers", "Vai para", {
                it: "Va a",
                nl: "Gaat naar",
                ja: "振り分け先",
                ko: "들어갈 곳",
            }),
            how: text("How", "Wie", "Cómo", "Comment", "Como", { it: "Come", nl: "Hoe", ja: "方法", ko: "방법" }),
            inParent: text("In {parent}", "In {parent}", "En {parent}", "Dans {parent}", "Em {parent}", {
                it: "In {parent}",
                nl: "In {parent}",
                ja: "{parent}内",
                ko: "{parent} 안",
            }),
            income: text("Income", "Einnahmen", "Ingresos", "Revenus", "Receitas", {
                it: "Entrate",
                nl: "Inkomsten",
                ja: "収入",
                ko: "수입",
            }),
            inMm: text(
                "In Money Manager",
                "In Money Manager",
                "En Money Manager",
                "Dans Money Manager",
                "No Money Manager",
                { it: "In Money Manager", nl: "In Money Manager", ja: "Money Manager内", ko: "Money Manager 안" }
            ),
            left: text("Left out", "Weggelassen", "Fuera", "Exclue", "Fora", {
                it: "Esclusi",
                nl: "Weggelaten",
                ja: "除外",
                ko: "제외됨",
            }),
            leave: text("Leave it out", "Weglassen", "Dejarla fuera", "Ne pas l'importer", "Deixar de fora", {
                it: "Escludilo",
                nl: "Laat het weg",
                ja: "除外する",
                ko: "제외하기",
            }),
            matched: text("Matched", "Zugeordnet", "Emparejada", "Associée", "Associada", {
                it: "Abbinati",
                nl: "Gekoppeld",
                ja: "一致",
                ko: "일치",
            }),
            mine: text("Mine", "Meine", "Las mías", "Les miennes", "As minhas", {
                it: "Mie",
                nl: "Mijn",
                ja: "自分の",
                ko: "내 것",
            }),
            newCategory: text(
                "New category",
                "Neue Kategorie",
                "Categoría nueva",
                "Nouvelle catégorie",
                "Categoria nova",
                { it: "Nuova categoria", nl: "Nieuwe categorie", ja: "新しいカテゴリ", ko: "새 카테고리" }
            ),
            newTag: text("New", "Neu", "Nueva", "Nouvelle", "Nova", {
                it: "Nuovo",
                nl: "Nieuw",
                ja: "新規",
                ko: "새 항목",
            }),
            noEntries: text("No entries", "Keine Einträge", "Sin movimientos", "Aucune opération", "Sem lançamentos", {
                "pt-PT": "Sem registos",
                it: "Nessun movimento",
                nl: "Geen transacties",
                ja: "記録なし",
                ko: "기록 없음",
            }),
            note: text(
                "Each one is matched to one of Outlayr's by meaning and keeps its name, unless several land on the same one.",
                "Jede wird nach Bedeutung einer Kategorie von Outlayr zugeordnet und behält ihren Namen, es sei denn, mehrere landen in derselben.",
                "Cada una se empareja con una de Outlayr por significado y conserva su nombre, salvo que varias caigan en la misma.",
                "Chacune est associée à une catégorie d'Outlayr selon son sens et garde son nom, sauf si plusieurs tombent sur la même.",
                "Cada uma é associada a uma do Outlayr pelo significado e mantém o nome, a menos que várias caiam na mesma.",
                {
                    it: "Ognuna viene abbinata a una di Outlayr in base al significato e mantiene il suo nome, a meno che più categorie finiscano nella stessa.",
                    nl: "Elke categorie wordt op betekenis gekoppeld aan een van Outlayr en houdt haar naam, tenzij er meerdere op dezelfde uitkomen.",
                    ja: "それぞれ意味でOutlayrのカテゴリに対応づけ、名前はそのまま使います。複数が同じカテゴリになる場合は除きます。",
                    ko: "각 항목은 의미에 따라 Outlayr 카테고리와 연결되고 이름은 그대로 유지돼요. 여러 개가 같은 곳에 연결되면 예외예요.",
                }
            ),
            other: text(
                "Or another category",
                "Oder eine andere Kategorie",
                "O en otra categoría",
                "Ou une autre catégorie",
                "Ou em outra categoria",
                {
                    it: "Oppure un'altra categoria",
                    nl: "Of een andere categorie",
                    ja: "または別のカテゴリ",
                    ko: "또는 다른 카테고리",
                }
            ),
            outlayrs: text("Outlayr's", "Von Outlayr", "Las de Outlayr", "Celles d'Outlayr", "As do Outlayr", {
                it: "Di Outlayr",
                nl: "Van Outlayr",
                ja: "Outlayr",
                ko: "Outlayr",
            }),
            putIn: text("Put it in", "Ablegen in", "Poner en", "Placer dans", "Colocar em", {
                it: "Mettila in",
                nl: "Zet het in",
                ja: "入れる先",
                ko: "넣을 곳",
            }),
            title: text("Categories", "Kategorien", "Categorías", "Catégories", "Categorias", {
                it: "Categorie",
                nl: "Categorieën",
                ja: "カテゴリ",
                ko: "카테고리",
            }),
            under: text(
                "Under {parent}",
                "Unter {parent}",
                "Dentro de {parent}",
                "Sous {parent}",
                "Dentro de {parent}",
                { it: "Sotto {parent}", nl: "Onder {parent}", ja: "{parent}の下", ko: "{parent} 아래" }
            ),
            use: text(
                "Use categories",
                "Kategorien verwenden",
                "Usar categorías",
                "Utiliser les catégories",
                "Usar categorias",
                { it: "Usa le categorie", nl: "Categorieën gebruiken", ja: "カテゴリを使う", ko: "카테고리 사용" }
            ),
        },
        done: {
            accounts: text("Accounts", "Konten", "Cuentas", "Comptes", "Contas", {
                it: "Conti",
                nl: "Rekeningen",
                ja: "口座",
                ko: "계좌",
            }),
            account: text("Account", "Konto", "Cuenta", "Compte", "Conta", {
                it: "Conto",
                nl: "Rekening",
                ja: "口座",
                ko: "계좌",
            }),
            adjusted: text(
                "Opening balance adjusted",
                "Anfangssaldo angepasst",
                "Saldo inicial ajustado",
                "Solde d'ouverture ajusté",
                "Saldo inicial ajustado",
                {
                    it: "Saldo iniziale rettificato",
                    nl: "Beginsaldo aangepast",
                    ja: "初期残高を調整済み",
                    ko: "초기 잔액 조정됨",
                }
            ),
            balancesAll: text(
                "Balances, all {n} match",
                "Kontostände, alle {n} stimmen",
                "Saldos, los {n} coinciden",
                "Soldes, les {n} concordent",
                "Saldos, os {n} batem",
                {
                    it: "Saldi, tutti e {n} corrispondono",
                    nl: "Saldo's, alle {n} kloppen",
                    ja: "残高、{n}件すべて一致",
                    ko: "잔액, {n}개 모두 일치",
                }
            ),
            balancesSome: text(
                "Balances, {n} of {total} match",
                "Kontostände, {n} von {total} stimmen",
                "Saldos, {n} de {total} coinciden",
                "Soldes, {n} sur {total} concordent",
                "Saldos, {n} de {total} batem",
                {
                    it: "Saldi, {n} su {total} corrispondono",
                    nl: "Saldo's, {n} van {total} kloppen",
                    ja: "残高、{total}件中{n}件が一致",
                    ko: "잔액, {total}개 중 {n}개 일치",
                }
            ),
            budgets: text("Budgets", "Budgets", "Presupuestos", "Budgets", "Orçamentos", {
                it: "Budget",
                nl: "Budgetten",
                ja: "予算",
                ko: "예산",
            }),
            categories: text("Categories", "Kategorien", "Categorías", "Catégories", "Categorias", {
                it: "Categorie",
                nl: "Categorieën",
                ja: "カテゴリ",
                ko: "카테고리",
            }),
            entries: text("Entries", "Einträge", "Movimientos", "Opérations", "Lançamentos", {
                "pt-PT": "Registos",
                it: "Movimenti",
                nl: "Transacties",
                ja: "記録",
                ko: "기록",
            }),
            inOutlayr: text("In Outlayr", "In Outlayr", "En Outlayr", "Dans Outlayr", "No Outlayr", {
                it: "In Outlayr",
                nl: "In Outlayr",
                ja: "Outlayr内",
                ko: "Outlayr에 있음",
            }),
            matchesMm: text(
                "Matches Money Manager",
                "Stimmt mit Money Manager überein",
                "Coincide con Money Manager",
                "Concorde avec Money Manager",
                "Bate com o Money Manager",
                {
                    it: "Corrisponde a Money Manager",
                    nl: "Komt overeen met Money Manager",
                    ja: "Money Managerと一致",
                    ko: "Money Manager와 일치",
                }
            ),
            movedIn: text(
                "Moved in, {day}",
                "Übernommen, {day}",
                "Importado el {day}",
                "Importé le {day}",
                "Importado em {day}",
                { it: "Importato, {day}", nl: "Overgezet, {day}", ja: "移行済み、{day}", ko: "옮김, {day}" }
            ),
            noCheck: text(
                "Money Manager kept no balances to check.",
                "Money Manager hat keine Kontostände zum Prüfen gespeichert.",
                "Money Manager no guardó saldos para comprobar.",
                "Money Manager n'a gardé aucun solde à vérifier.",
                "O Money Manager não guardou saldos para conferir.",
                {
                    it: "Money Manager non aveva saldi da controllare.",
                    nl: "Money Manager had geen saldo's om te controleren.",
                    ja: "Money Managerには確認できる残高がありませんでした。",
                    ko: "확인할 Money Manager 잔액이 없었어요.",
                }
            ),
            openTransactions: text(
                "Open transactions",
                "Einträge öffnen",
                "Abrir movimientos",
                "Ouvrir les opérations",
                "Abrir lançamentos",
                {
                    "pt-PT": "Abrir registos",
                    it: "Apri i movimenti",
                    nl: "Transacties openen",
                    ja: "記録を開く",
                    ko: "기록 열기",
                }
            ),
            shows: text(
                "Money Manager shows",
                "Money Manager zeigt",
                "Money Manager muestra",
                "Money Manager affiche",
                "O Money Manager mostra",
                {
                    it: "Money Manager mostra",
                    nl: "Money Manager toont",
                    ja: "Money Managerの表示",
                    ko: "Money Manager 표시",
                }
            ),
            undo: text(
                "Undo import",
                "Import rückgängig machen",
                "Deshacer importación",
                "Annuler l'import",
                "Desfazer importação",
                {
                    it: "Annulla importazione",
                    nl: "Import ongedaan maken",
                    ja: "インポートを取り消す",
                    ko: "가져오기 취소",
                }
            ),
            undoBody: text(
                "{n} entries from {day}. Removes everything this import added. What you logged since stays.",
                "{n} Einträge vom {day}. Entfernt alles, was dieser Import hinzugefügt hat. Was du seitdem erfasst hast, bleibt.",
                "{n} movimientos del {day}. Quita todo lo que agregó esta importación. Lo que registraste después se queda.",
                "{n} opérations du {day}. Supprime tout ce que cet import a ajouté. Ce que vous avez saisi depuis reste.",
                "{n} lançamentos de {day}. Remove tudo o que esta importação adicionou. O que você registrou depois fica.",
                {
                    "es-ES":
                        "{n} movimientos del {day}. Quita todo lo que añadió esta importación. Lo que registraste después se queda.",
                    "pt-PT":
                        "{n} registos de {day}. Remove tudo o que esta importação adicionou. O que registou depois fica.",
                    it: "{n} movimenti dal {day}. Rimuove tutto ciò che questa importazione ha aggiunto. Quello che hai registrato dopo resta.",
                    nl: "{n} transacties vanaf {day}. Haalt alles weg wat deze import heeft toegevoegd. Wat je sindsdien hebt vastgelegd blijft.",
                    ja: "{day}からの記録{n}件。このインポートで追加した記録をすべて削除します。その後に記録したものは残ります。",
                    ko: "{day}부터의 기록 {n}건. 이번 가져오기로 추가된 기록을 모두 지워요. 그 뒤에 기록한 내용은 그대로 남아요.",
                }
            ),
            undoConfirm: text(
                "Undo the Money Manager import?",
                "Den Money-Manager-Import rückgängig machen?",
                "¿Deshacer la importación de Money Manager?",
                "Annuler l'import Money Manager ?",
                "Desfazer a importação do Money Manager?",
                {
                    it: "Annullare l'importazione da Money Manager?",
                    nl: "De import van Money Manager ongedaan maken?",
                    ja: "Money Managerのインポートを取り消しますか？",
                    ko: "Money Manager 가져오기를 취소할까요?",
                }
            ),
            undoFailed: text(
                "Couldn't undo the import. Try again.",
                "Der Import konnte nicht rückgängig gemacht werden. Versuch es noch mal.",
                "No se pudo deshacer la importación. Inténtalo de nuevo.",
                "Impossible d'annuler l'import. Réessayez.",
                "Não foi possível desfazer a importação. Tente de novo.",
                {
                    it: "Non siamo riusciti ad annullare l'importazione. Riprova.",
                    nl: "De import kon niet ongedaan worden gemaakt. Probeer het opnieuw.",
                    ja: "インポートを取り消せませんでした。もう一度お試しください。",
                    ko: "가져오기를 취소하지 못했어요. 다시 시도해 주세요.",
                }
            ),
            undoTitle: text(
                "Undo Money Manager import",
                "Money-Manager-Import rückgängig machen",
                "Deshacer importación de Money Manager",
                "Annuler l'import Money Manager",
                "Desfazer importação do Money Manager",
                {
                    it: "Annulla importazione da Money Manager",
                    nl: "Import van Money Manager ongedaan maken",
                    ja: "Money Managerのインポートを取り消す",
                    ko: "Money Manager 가져오기 취소",
                }
            ),
            undone: text(
                "Import undone",
                "Import rückgängig gemacht",
                "Importación deshecha",
                "Import annulé",
                "Importação desfeita",
                {
                    it: "Importazione annullata",
                    nl: "Import ongedaan gemaakt",
                    ja: "インポートを取り消しました",
                    ko: "가져오기를 취소했어요",
                }
            ),
        },
        failed: {
            back: text(
                "Back to overview",
                "Zurück zur Übersicht",
                "Volver al resumen",
                "Retour à l'aperçu",
                "Voltar ao resumo",
                { it: "Torna alla panoramica", nl: "Terug naar overzicht", ja: "概要に戻る", ko: "개요로 돌아가기" }
            ),
            body: text(
                "The write failed, so your ledger is unchanged.",
                "Das Schreiben ist fehlgeschlagen, dein Haushaltsbuch ist unverändert.",
                "La escritura falló, así que tu libro no cambió.",
                "L'écriture a échoué, votre registre n'a donc pas changé.",
                "A gravação falhou, então seu livro não mudou.",
                {
                    it: "La scrittura non è riuscita, quindi il tuo registro è invariato.",
                    nl: "Het schrijven mislukte, dus je huishoudboekje is ongewijzigd.",
                    ja: "書き込みに失敗したため、家計簿は変更されていません。",
                    ko: "저장에 실패해서 가계부는 그대로예요.",
                }
            ),
            retry: text("Try again", "Versuch es noch mal", "Intentar de nuevo", "Réessayer", "Tentar de novo", {
                it: "Riprova",
                nl: "Opnieuw proberen",
                ja: "再試行",
                ko: "다시 시도",
            }),
            title: text(
                "Nothing was imported",
                "Es wurde nichts importiert",
                "No se importó nada",
                "Rien n'a été importé",
                "Nada foi importado",
                {
                    it: "Non è stato importato nulla",
                    nl: "Er is niets geïmporteerd",
                    ja: "何もインポートされませんでした",
                    ko: "가져온 항목이 없어요",
                }
            ),
        },
        importing: {
            accounts: text("Accounts", "Konten", "Cuentas", "Comptes", "Contas", {
                it: "Conti",
                nl: "Rekeningen",
                ja: "口座",
                ko: "계좌",
            }),
            balance: text(
                "Balance check",
                "Kontostandprüfung",
                "Comprobación de saldos",
                "Vérification des soldes",
                "Conferência de saldos",
                { it: "Controllo del saldo", nl: "Saldocontrole", ja: "残高チェック", ko: "잔액 확인" }
            ),
            body: text(
                "Writing {n} entries. Keep this tab open.",
                "{n} Einträge werden geschrieben. Lass diesen Tab offen.",
                "Escribiendo {n} movimientos. Mantén esta pestaña abierta.",
                "Écriture de {n} opérations. Gardez cet onglet ouvert.",
                "Gravando {n} lançamentos. Mantenha esta aba aberta.",
                {
                    "pt-PT": "A gravar {n} registos. Mantenha esta aba aberta.",
                    it: "Scrittura di {n} movimenti. Tieni aperta questa scheda.",
                    nl: "{n} transacties schrijven. Laat dit tabblad open.",
                    ja: "{n}件の記録を書き込み中です。このタブを開いたままにしてください。",
                    ko: "기록 {n}건을 저장하는 중이에요. 이 탭을 열어 두세요.",
                }
            ),
            budgets: text(
                "Monthly budgets",
                "Monatliche Budgets",
                "Presupuestos mensuales",
                "Budgets mensuels",
                "Orçamentos mensais",
                { it: "Budget mensili", nl: "Maandbudgetten", ja: "月ごとの予算", ko: "월별 예산" }
            ),
            categories: text("Categories", "Kategorien", "Categorías", "Catégories", "Categorias", {
                it: "Categorie",
                nl: "Categorieën",
                ja: "カテゴリ",
                ko: "카테고리",
            }),
            entries: text("Entries", "Einträge", "Movimientos", "Opérations", "Lançamentos", {
                "pt-PT": "Registos",
                it: "Movimenti",
                nl: "Transacties",
                ja: "記録",
                ko: "기록",
            }),
            heading: text("Importing", "Import läuft", "Importando", "Import en cours", "Importando", {
                "pt-PT": "A importar",
                it: "Importazione",
                nl: "Importeren",
                ja: "インポート中",
                ko: "가져오는 중",
            }),
            steps: text("Steps", "Schritte", "Pasos", "Étapes", "Etapas", {
                it: "Passaggi",
                nl: "Stappen",
                ja: "手順",
                ko: "단계",
            }),
            title: text("Importing…", "Import läuft…", "Importando…", "Import en cours…", "Importando…", {
                "pt-PT": "A importar…",
                it: "Importazione…",
                nl: "Importeren…",
                ja: "インポート中…",
                ko: "가져오는 중…",
            }),
            writing: text("Writing", "Schreiben", "Escribiendo", "Écriture", "Gravando", {
                "pt-PT": "A gravar",
                it: "Scrittura",
                nl: "Schrijven",
                ja: "書き込み中",
                ko: "저장 중",
            }),
        },
        intro: {
            backupTitle: text(
                "Make a backup first",
                "Zuerst ein Backup erstellen",
                "Haz un respaldo primero",
                "Faites d'abord une sauvegarde",
                "Faça um backup primeiro",
                {
                    it: "Fai prima un backup",
                    nl: "Maak eerst een back-up",
                    ja: "まずバックアップを作成",
                    ko: "먼저 백업 만들기",
                }
            ),
            choose: text(
                "Choose the backup",
                "Backup wählen",
                "Elegir el respaldo",
                "Choisir la sauvegarde",
                "Escolher o backup",
                {
                    "pt-PT": "Escolher a cópia",
                    it: "Scegli il backup",
                    nl: "Kies de back-up",
                    ja: "バックアップを選択",
                    ko: "백업 선택",
                }
            ),
            comesOver: text(
                "Comes over",
                "Wird übernommen",
                "Qué se importa",
                "Ce qui est importé",
                "O que vem junto",
                { it: "Cosa viene importato", nl: "Wat meekomt", ja: "取り込まれるもの", ko: "가져오는 항목" }
            ),
            drop: text(
                "Drop your backup here",
                "Lege dein Backup hier ab",
                "Suelta tu respaldo aquí",
                "Déposez votre sauvegarde ici",
                "Solte seu backup aqui",
                {
                    it: "Trascina qui il tuo backup",
                    nl: "Zet je back-up hier neer",
                    ja: "バックアップをここにドロップ",
                    ko: "백업을 여기에 놓으세요",
                }
            ),
            dropHint: text(
                "The file ends in .mmbackup",
                "Die Datei endet auf .mmbackup",
                "El archivo termina en .mmbackup",
                "Le fichier se termine par .mmbackup",
                "O arquivo termina em .mmbackup",
                {
                    "pt-PT": "O ficheiro termina em .mmbackup",
                    it: "Il file termina con .mmbackup",
                    nl: "Het bestand eindigt op .mmbackup",
                    ja: "ファイル名は.mmbackupで終わります",
                    ko: "파일 이름이 .mmbackup으로 끝나요",
                }
            ),
            items: [
                text(
                    "Entries and transfers",
                    "Einträge und Umbuchungen",
                    "Movimientos y transferencias",
                    "Opérations et virements",
                    "Lançamentos e transferências",
                    {
                        "pt-PT": "Registos e transferências",
                        it: "Movimenti e trasferimenti",
                        nl: "Transacties en overboekingen",
                        ja: "記録と振替",
                        ko: "기록과 이체",
                    }
                ),
                text(
                    "Accounts and balances",
                    "Konten und Kontostände",
                    "Cuentas y saldos",
                    "Comptes et soldes",
                    "Contas e saldos",
                    { it: "Conti e saldi", nl: "Rekeningen en saldo's", ja: "口座と残高", ko: "계좌와 잔액" }
                ),
                text("Categories", "Kategorien", "Categorías", "Catégories", "Categorias", {
                    it: "Categorie",
                    nl: "Categorieën",
                    ja: "カテゴリ",
                    ko: "카테고리",
                }),
                text(
                    "Monthly budgets",
                    "Monatliche Budgets",
                    "Presupuestos mensuales",
                    "Budgets mensuels",
                    "Orçamentos mensais",
                    { it: "Budget mensili", nl: "Maandbudgetten", ja: "月ごとの予算", ko: "월별 예산" }
                ),
                text(
                    "Currencies and rates",
                    "Währungen und Kurse",
                    "Monedas y tasas",
                    "Devises et taux",
                    "Moedas e taxas",
                    {
                        "es-ES": "Monedas y Tipos de cambio",
                        it: "Valute e tassi",
                        nl: "Valuta en koersen",
                        ja: "通貨とレート",
                        ko: "통화와 환율",
                    }
                ),
            ],
            nothingFinal: text(
                "Nothing is final",
                "Nichts ist endgültig",
                "Nada es definitivo",
                "Rien n'est définitif",
                "Nada é definitivo",
                { it: "Niente è definitivo", nl: "Niets is definitief", ja: "確定はしません", ko: "확정되는 건 없어요" }
            ),
            nothingFinalBody: text(
                "You check everything before it's written, and you can undo the import from History.",
                "Du prüfst alles, bevor es geschrieben wird, und kannst den Import im Verlauf rückgängig machen.",
                "Revisas todo antes de que se escriba, y puedes deshacer la importación desde el Historial.",
                "Vous vérifiez tout avant l'écriture, et vous pouvez annuler l'import depuis l'Historique.",
                "Você confere tudo antes de gravar e pode desfazer a importação pelo Histórico.",
                {
                    "pt-PT": "Confere tudo antes de gravar e pode desfazer a importação pelo Histórico.",
                    it: "Controlli tutto prima che venga scritto e puoi annullare l'importazione dalla Cronologia.",
                    nl: "Je controleert alles voordat het wordt weggeschreven, en je kunt de import ongedaan maken via Geschiedenis.",
                    ja: "書き込む前にすべて確認でき、インポートは履歴から取り消せます。",
                    ko: "저장하기 전에 모두 확인할 수 있고, 가져오기는 내역에서 취소할 수 있어요.",
                }
            ),
            steps: [
                text(
                    "In Money Manager, open Settings and find Backup.",
                    "Öffne in Money Manager die Einstellungen und such nach Backup.",
                    "En Money Manager, abre Ajustes y busca Respaldo.",
                    "Dans Money Manager, ouvrez Réglages et trouvez Sauvegarde.",
                    "No Money Manager, abra Ajustes e encontre Backup.",
                    {
                        it: "In Money Manager, apri Impostazioni e cerca Backup.",
                        nl: "Open in Money Manager de Instellingen en zoek Back-up.",
                        ja: "Money Managerで設定を開き、バックアップを探します。",
                        ko: "Money Manager에서 설정을 열고 백업을 찾으세요.",
                    }
                ),
                text(
                    "Create a backup and share it to this computer.",
                    "Erstelle ein Backup und teile es an diesen Computer.",
                    "Crea un respaldo y pásalo a esta computadora.",
                    "Créez une sauvegarde et transférez-la sur cet ordinateur.",
                    "Crie um backup e passe-o para este computador.",
                    {
                        "es-ES": "Crea un respaldo y pásalo a esta ordenador.",
                        it: "Crea un backup e condividilo con questo computer.",
                        nl: "Maak een back-up en deel die met deze computer.",
                        ja: "バックアップを作成し、このコンピュータに共有します。",
                        ko: "백업을 만들어 이 컴퓨터로 공유하세요.",
                    }
                ),
                text(
                    "Drop it below, or choose it.",
                    "Lege es unten ab oder wähle es aus.",
                    "Suéltalo abajo, o elígelo.",
                    "Déposez-la ci-dessous, ou choisissez-la.",
                    "Solte-o abaixo, ou escolha-o.",
                    {
                        it: "Rilascialo qui sotto o sceglilo.",
                        nl: "Zet hem hieronder neer, of kies hem.",
                        ja: "下にドロップするか、ファイルを選択してください。",
                        ko: "아래에 놓거나 파일을 선택하세요.",
                    }
                ),
            ],
        },
        overview: {
            accounts: text("Accounts", "Konten", "Cuentas", "Comptes", "Contas", {
                it: "Conti",
                nl: "Rekeningen",
                ja: "口座",
                ko: "계좌",
            }),
            accountsDetail: text(
                "{open} open, {hidden} hidden",
                "{open} offen, {hidden} ausgeblendet",
                "{open} abiertas, {hidden} ocultas",
                "{open} ouverts, {hidden} masqués",
                "{open} abertas, {hidden} ocultas",
                {
                    it: "{open} aperti, {hidden} nascosti",
                    nl: "{open} open, {hidden} verborgen",
                    ja: "表示中{open}件、非表示{hidden}件",
                    ko: "표시 {open}개, 숨김 {hidden}개",
                }
            ),
            budgets: text(
                "Monthly budgets",
                "Monatliche Budgets",
                "Presupuestos mensuales",
                "Budgets mensuels",
                "Orçamentos mensais",
                { it: "Budget mensili", nl: "Maandbudgetten", ja: "月ごとの予算", ko: "월별 예산" }
            ),
            budgetsDetail: text("{n} budgets", "{n} Budgets", "{n} presupuestos", "{n} budgets", "{n} orçamentos", {
                it: "{n} budget",
                nl: "{n} budgetten",
                ja: "予算{n}件",
                ko: "예산 {n}개",
            }),
            categories: text("Categories", "Kategorien", "Categorías", "Catégories", "Categorias", {
                it: "Categorie",
                nl: "Categorieën",
                ja: "カテゴリ",
                ko: "카테고리",
            }),
            categoriesDetail: text(
                "{matched} matched, {created} new",
                "{matched} zugeordnet, {created} neu",
                "{matched} emparejadas, {created} nuevas",
                "{matched} associées, {created} nouvelles",
                "{matched} associadas, {created} novas",
                {
                    it: "{matched} abbinati, {created} nuovi",
                    nl: "{matched} gekoppeld, {created} nieuw",
                    ja: "一致{matched}件、新規{created}件",
                    ko: "일치 {matched}개, 새 항목 {created}개",
                }
            ),
            comingOver: text(
                "Coming over",
                "Wird übernommen",
                "Lo que se importa",
                "Ce qui est importé",
                "O que vem junto",
                { it: "Cosa verrà importato", nl: "Wat er meekomt", ja: "取り込まれる内容", ko: "가져올 내용" }
            ),
            currencies: text("Currencies", "Währungen", "Monedas", "Devises", "Moedas", {
                it: "Valute",
                nl: "Valuta",
                ja: "通貨",
                ko: "통화",
            }),
            currenciesDetail: text(
                "{list} at Money Manager's rates",
                "{list} zu den Kursen von Money Manager",
                "{list} a las tasas de Money Manager",
                "{list} aux taux de Money Manager",
                "{list} nas taxas do Money Manager",
                {
                    "es-ES": "{list} a las Tipos de cambio de Money Manager",
                    it: "{list} ai tassi di Money Manager",
                    nl: "{list} tegen de koersen van Money Manager",
                    ja: "Money Managerのレートで{list}",
                    ko: "Money Manager 환율로 {list}",
                }
            ),
            deletedAccounts: text(
                "Deleted accounts",
                "Gelöschte Konten",
                "Cuentas eliminadas",
                "Comptes supprimés",
                "Contas excluídas",
                {
                    "pt-PT": "Contas eliminadas",
                    it: "Conti eliminati",
                    nl: "Verwijderde rekeningen",
                    ja: "削除された口座",
                    ko: "삭제된 계좌",
                }
            ),
            deletedEntries: text(
                "Deleted entries",
                "Gelöschte Einträge",
                "Movimientos eliminados",
                "Opérations supprimées",
                "Lançamentos excluídos",
                {
                    "pt-PT": "Registos eliminados",
                    it: "Movimenti eliminati",
                    nl: "Verwijderde transacties",
                    ja: "削除された記録",
                    ko: "삭제된 기록",
                }
            ),
            entries: text("{n} entries", "{n} Einträge", "{n} movimientos", "{n} opérations", "{n} lançamentos", {
                "pt-PT": "{n} registos",
                it: "{n} movimenti",
                nl: "{n} transacties",
                ja: "{n}件の記録",
                ko: "기록 {n}건",
            }),
            leftBehind: text("Left behind", "Zurückgelassen", "Lo que se queda", "Ce qui reste", "O que fica", {
                it: "Lasciati indietro",
                nl: "Achtergelaten",
                ja: "取り込まないもの",
                ko: "가져오지 않는 항목",
            }),
            needs: text(
                "Needs a look",
                "Braucht einen Blick",
                "Requiere atención",
                "À vérifier",
                "Precisa de atenção",
                { it: "Da controllare", nl: "Even bekijken", ja: "要確認", ko: "확인 필요" }
            ),
            noCategory: text(
                "{n} with no category",
                "{n} ohne Kategorie",
                "{n} sin categoría",
                "{n} sans catégorie",
                "{n} sem categoria",
                {
                    it: "{n} senza categoria",
                    nl: "{n} zonder categorie",
                    ja: "{n}件がカテゴリなし",
                    ko: "{n}건은 카테고리 없음",
                }
            ),
            offMany: text(
                "Balances don't add up",
                "Kontostände stimmen nicht",
                "Los saldos no cuadran",
                "Les soldes ne concordent pas",
                "Os saldos não batem",
                {
                    it: "I saldi non quadrano",
                    nl: "Saldo's kloppen niet",
                    ja: "残高が合いません",
                    ko: "잔액이 맞지 않아요",
                }
            ),
            offManyDetail: text(
                "{n} accounts are off",
                "{n} Konten weichen ab",
                "{n} cuentas con diferencia",
                "{n} comptes avec un écart",
                "{n} contas com diferença",
                {
                    it: "{n} conti non quadrano",
                    nl: "{n} rekeningen kloppen niet",
                    ja: "{n}件の口座が合いません",
                    ko: "계좌 {n}개가 맞지 않아요",
                }
            ),
            offOne: text(
                "{name} doesn't add up",
                "{name} stimmt nicht",
                "{name} no cuadra",
                "{name} ne concorde pas",
                "{name} não bate",
                {
                    it: "{name} non quadra",
                    nl: "{name} klopt niet",
                    ja: "{name}が合いません",
                    ko: "{name}이(가) 맞지 않아요",
                }
            ),
            offOneDetail: text(
                "Off by {amount}",
                "Abweichung von {amount}",
                "Diferencia de {amount}",
                "Écart de {amount}",
                "Diferença de {amount}",
                { it: "Differenza di {amount}", nl: "{amount} verschil", ja: "{amount}の差", ko: "{amount} 차이" }
            ),
            pairs: text(
                "{n} look like transfers",
                "{n} sehen nach Umbuchungen aus",
                "{n} parecen transferencias",
                "{n} ressemblent à des virements",
                "{n} parecem transferências",
                {
                    it: "{n} sembrano trasferimenti",
                    nl: "{n} lijken op overboekingen",
                    ja: "{n}件が振替に見えます",
                    ko: "이체로 보이는 항목 {n}건",
                }
            ),
            range: text("{from} to {to}", "{from} nach {to}", "{from} a {to}", "{from} à {to}", "{from} a {to}", {
                it: "Da {from} a {to}",
                nl: "{from} naar {to}",
                ja: "{from}から{to}",
                ko: "{from}에서 {to}(으)로",
            }),
            reminders: text("Reminders", "Erinnerungen", "Recordatorios", "Rappels", "Lembretes", {
                it: "Promemoria",
                nl: "Herinneringen",
                ja: "リマインダー",
                ko: "리마인더",
            }),
            setUp: text(
                "Set up for you",
                "Für dich eingerichtet",
                "Preparado para ti",
                "Préparé pour vous",
                "Preparado para você",
                {
                    "pt-PT": "Preparado para si",
                    it: "Impostati per te",
                    nl: "Voor je ingesteld",
                    ja: "自動で設定",
                    ko: "자동으로 설정됨",
                }
            ),
            starting: text("Starting from", "Ab", "Empezando desde", "À partir de", "Começando de", {
                "pt-PT": "A começar de",
                it: "Si parte da",
                nl: "Beginnend bij",
                ja: "開始日",
                ko: "시작 시점",
            }),
            startingAll: text(
                "Everything in the backup",
                "Alles im Backup",
                "Todo lo del respaldo",
                "Tout le contenu de la sauvegarde",
                "Tudo do backup",
                {
                    it: "Tutto quello che c'è nel backup",
                    nl: "Alles in de back-up",
                    ja: "バックアップの全件",
                    ko: "백업에 있는 모든 항목",
                }
            ),
            startingCutoff: text(
                "Up to {day}, Outlayr has the rest",
                "Bis {day}, den Rest hat Outlayr",
                "Hasta el {day}, Outlayr tiene el resto",
                "Jusqu'au {day}, Outlayr a le reste",
                "Até {day}, o Outlayr tem o resto",
                {
                    it: "Fino al {day}, il resto lo ha già Outlayr",
                    nl: "Tot {day}, de rest heeft Outlayr al",
                    ja: "{day}まで。残りはOutlayrにあります",
                    ko: "{day}까지만. 나머지는 Outlayr에 있어요",
                }
            ),
            startingSkip: text(
                "Everything, matches skipped",
                "Alles, Übereinstimmungen übersprungen",
                "Todo, sin las coincidencias",
                "Tout, sans les doublons",
                "Tudo, sem as coincidências",
                {
                    it: "Tutto, corrispondenze escluse",
                    nl: "Alles, overeenkomsten overgeslagen",
                    ja: "すべて、一致分はスキップ",
                    ko: "모두, 일치 항목은 건너뛰기",
                }
            ),
            undo: text("Undo", "Rückgängig", "Deshacer", "Annuler", "Desfazer", {
                it: "Annulla",
                nl: "Ongedaan maken",
                ja: "元に戻す",
                ko: "실행 취소",
            }),
            undoBody: text(
                "You can undo it from Import, History.",
                "Du kannst es unter Import, Verlauf rückgängig machen.",
                "Puedes deshacerlo desde Importar, Historial.",
                "Vous pouvez l'annuler depuis Importer, Historique.",
                "Você pode desfazer em Importar, Histórico.",
                {
                    "pt-PT": "Pode desfazer em Importar, Histórico.",
                    it: "Puoi annullarla da Importa, Cronologia.",
                    nl: "Je kunt het ongedaan maken via Importeren, Geschiedenis.",
                    ja: "インポートの履歴から取り消せます。",
                    ko: "가져오기의 내역에서 취소할 수 있어요.",
                }
            ),
        },
        reading: {
            file: text("File", "Datei", "Archivo", "Fichier", "Arquivo", {
                "pt-PT": "Ficheiro",
                it: "File",
                nl: "Bestand",
                ja: "ファイル",
                ko: "파일",
            }),
            local: text(
                "Read on this device",
                "Auf diesem Gerät gelesen",
                "Se lee en este dispositivo",
                "Lu sur cet appareil",
                "Lido neste dispositivo",
                {
                    it: "Letto su questo dispositivo",
                    nl: "Op dit apparaat gelezen",
                    ja: "このデバイスで読み取り",
                    ko: "이 기기에서 읽음",
                }
            ),
            next: text("Comes next", "Als Nächstes", "Lo que sigue", "La suite", "O que vem a seguir", {
                it: "Poi",
                nl: "Hierna",
                ja: "このあと",
                ko: "다음 단계",
            }),
            nextBody: text(
                "You check accounts, categories and balances before anything is written.",
                "Du prüfst Konten, Kategorien und Kontostände, bevor etwas geschrieben wird.",
                "Revisas cuentas, categorías y saldos antes de que se escriba nada.",
                "Vous vérifiez comptes, catégories et soldes avant toute écriture.",
                "Você confere contas, categorias e saldos antes de gravar qualquer coisa.",
                {
                    "pt-PT": "Confere contas, categorias e saldos antes de gravar qualquer coisa.",
                    it: "Controlli conti, categorie e saldi prima che venga scritto qualcosa.",
                    nl: "Je controleert rekeningen, categorieën en saldo's voordat er iets wordt weggeschreven.",
                    ja: "書き込む前に、口座、カテゴリ、残高を確認できます。",
                    ko: "무엇이든 저장하기 전에 계좌, 카테고리, 잔액을 확인해요.",
                }
            ),
            reading: text(
                "Reading the backup…",
                "Backup wird gelesen…",
                "Leyendo el respaldo…",
                "Lecture de la sauvegarde…",
                "Lendo o backup…",
                {
                    "pt-PT": "A ler a cópia…",
                    it: "Lettura del backup…",
                    nl: "De back-up lezen…",
                    ja: "バックアップを読み取り中…",
                    ko: "백업을 읽는 중…",
                }
            ),
            title: text(
                "Open the backup",
                "Backup öffnen",
                "Abrir el respaldo",
                "Ouvrir la sauvegarde",
                "Abrir o backup",
                { it: "Apri il backup", nl: "Open de back-up", ja: "バックアップを開く", ko: "백업 열기" }
            ),
        },
        start: {
            all: text("Bring everything", "Alles übernehmen", "Traer todo", "Tout importer", "Trazer tudo", {
                it: "Importa tutto",
                nl: "Alles meenemen",
                ja: "すべて取り込む",
                ko: "모두 가져오기",
            }),
            allHint: text(
                "Those days may count twice.",
                "Diese Tage könnten doppelt zählen.",
                "Esos días podrían contarse dos veces.",
                "Ces jours pourraient compter deux fois.",
                "Esses dias podem contar duas vezes.",
                {
                    it: "Quei giorni potrebbero contare due volte.",
                    nl: "Die dagen tellen mogelijk dubbel.",
                    ja: "その期間は二重に数えられる可能性があります。",
                    ko: "그 기간은 이중으로 집계될 수 있어요.",
                }
            ),
            both: text(
                "Both have entries from {day}",
                "Beide haben Einträge ab dem {day}",
                "Ambos tienen movimientos desde el {day}",
                "Les deux ont des opérations depuis le {day}",
                "Ambos têm lançamentos desde {day}",
                {
                    "pt-PT": "Ambos têm registos desde {day}",
                    it: "Entrambi hanno movimenti dal {day}",
                    nl: "Beide hebben transacties vanaf {day}",
                    ja: "どちらにも{day}からの記録があります",
                    ko: "둘 다 {day}부터 기록이 있어요",
                }
            ),
            cutoff: text(
                "Stop Money Manager before {day}",
                "Money Manager vor dem {day} beenden",
                "Parar Money Manager antes del {day}",
                "Arrêter Money Manager avant le {day}",
                "Parar o Money Manager antes de {day}",
                {
                    it: "Smetti di usare Money Manager prima del {day}",
                    nl: "Stop met Money Manager vóór {day}",
                    ja: "{day}より前にMoney Managerの使用をやめてください",
                    ko: "{day} 전에 Money Manager 사용을 멈추세요",
                }
            ),
            cutoffHint: text(
                "Your Outlayr entries from then stay as they are.",
                "Deine Outlayr-Einträge ab dann bleiben, wie sie sind.",
                "Tus movimientos de Outlayr desde entonces quedan como están.",
                "Vos opérations Outlayr à partir de là restent telles quelles.",
                "Seus lançamentos do Outlayr a partir daí ficam como estão.",
                {
                    "pt-PT": "Seus registos do Outlayr a partir daí ficam como estão.",
                    it: "I tuoi movimenti di Outlayr di allora restano come sono.",
                    nl: "Je transacties in Outlayr van die tijd blijven zoals ze zijn.",
                    ja: "その時点以降のOutlayrの記録はそのまま残ります。",
                    ko: "그때부터 Outlayr에 있던 기록은 그대로 유지돼요.",
                }
            ),
            entries: text("{n} entries", "{n} Einträge", "{n} movimientos", "{n} opérations", "{n} lançamentos", {
                "pt-PT": "{n} registos",
                it: "{n} movimenti",
                nl: "{n} transacties",
                ja: "{n}件の記録",
                ko: "기록 {n}건",
            }),
            from: text("From {day}", "Ab dem {day}", "Desde el {day}", "À partir du {day}", "A partir de {day}", {
                it: "Dal {day}",
                nl: "Vanaf {day}",
                ja: "{day}から",
                ko: "{day}부터",
            }),
            inMm: text(
                "In Money Manager",
                "In Money Manager",
                "En Money Manager",
                "Dans Money Manager",
                "No Money Manager",
                { it: "In Money Manager", nl: "In Money Manager", ja: "Money Manager内", ko: "Money Manager 안" }
            ),
            inOutlayr: text("In Outlayr", "In Outlayr", "En Outlayr", "Dans Outlayr", "No Outlayr", {
                it: "In Outlayr",
                nl: "In Outlayr",
                ja: "Outlayr内",
                ko: "Outlayr에 있음",
            }),
            question: text(
                "What should happen to those days?",
                "Was soll mit diesen Tagen passieren?",
                "¿Qué pasa con esos días?",
                "Que faire de ces jours ?",
                "O que fazer com esses dias?",
                {
                    it: "Cosa deve succedere a quei giorni?",
                    nl: "Wat moet er met die dagen gebeuren?",
                    ja: "その期間はどうしますか？",
                    ko: "그 기간은 어떻게 할까요?",
                }
            ),
            same: text(
                "Same in both",
                "In beiden gleich",
                "Iguales en ambos",
                "Identiques dans les deux",
                "Iguais nos dois",
                { it: "Uguali in entrambi", nl: "Gelijk in beide", ja: "両方で同じ", ko: "양쪽이 같음" }
            ),
            skip: text(
                "Bring everything, skip matches",
                "Alles übernehmen, Übereinstimmungen überspringen",
                "Traer todo, omitir coincidencias",
                "Tout importer, ignorer les doublons",
                "Trazer tudo, pular coincidências",
                {
                    it: "Importa tutto, salta le corrispondenze",
                    nl: "Alles meenemen, overeenkomsten overslaan",
                    ja: "すべて取り込み、一致分はスキップ",
                    ko: "모두 가져오기, 일치 항목은 건너뛰기",
                }
            ),
            skipHint: text(
                "Same day, amount and currency count as a match. Found: {n}.",
                "Gleicher Tag, Betrag und gleiche Währung zählen als Übereinstimmung. Gefunden: {n}.",
                "Mismo día, monto y moneda cuentan como coincidencia. Encontradas: {n}.",
                "Même jour, montant et devise comptent comme un doublon. Trouvés : {n}.",
                "Mesmo dia, valor e moeda contam como coincidência. Encontradas: {n}.",
                {
                    "es-ES": "Mismo día, importe y moneda cuentan como coincidencia. Encontradas: {n}.",
                    it: "Stesso giorno, importo e valuta contano come corrispondenza. Trovati: {n}.",
                    nl: "Dezelfde dag, hetzelfde bedrag en dezelfde valuta tellen als overeenkomst. Gevonden: {n}.",
                    ja: "日付、金額、通貨が同じものは一致とみなします。見つかった件数：{n}。",
                    ko: "날짜, 금액, 통화가 같으면 일치로 봐요. 찾은 수: {n}.",
                }
            ),
            title: text("Starting from", "Ab", "Empezando desde", "À partir de", "Começando de", {
                "pt-PT": "A começar de",
                it: "Si parte da",
                nl: "Beginnend bij",
                ja: "開始日",
                ko: "시작 시점",
            }),
            why: text(
                "Why it matters",
                "Warum das wichtig ist",
                "Por qué importa",
                "Pourquoi c'est important",
                "Por que importa",
                { it: "Perché conta", nl: "Waarom het ertoe doet", ja: "重要な理由", ko: "중요한 이유" }
            ),
            whyBody: text(
                "Importing a day twice doubles what you spent. The default keeps the entries you already logged here.",
                "Wird ein Tag doppelt importiert, verdoppelt sich, was du ausgegeben hast. Die Standardeinstellung behält die Einträge, die du hier schon erfasst hast.",
                "Importar un día dos veces duplica lo que gastaste. Lo predeterminado conserva los movimientos que ya registraste aquí.",
                "Importer un jour deux fois double vos dépenses. Par défaut, on garde les opérations déjà saisies ici.",
                "Importar um dia duas vezes dobra o que você gastou. O padrão mantém os lançamentos que você já registrou aqui.",
                {
                    "pt-PT":
                        "Importar um dia duas vezes dobra o que gastou. O padrão mantém os registos que já registou aqui.",
                    it: "Importare un giorno due volte raddoppia ciò che hai speso. L'impostazione predefinita mantiene i movimenti che hai già registrato qui.",
                    nl: "Een dag twee keer importeren verdubbelt wat je hebt uitgegeven. De standaardkeuze houdt de transacties die je hier al hebt vastgelegd.",
                    ja: "同じ日を2回インポートすると、支出が二重になります。デフォルトでは、ここに記録済みのものを残します。",
                    ko: "같은 날을 두 번 가져오면 지출이 두 배가 돼요. 기본값은 여기에 이미 기록한 내용을 남겨요.",
                }
            ),
        },
        uncategorized: {
            account: text("Account", "Konto", "Cuenta", "Compte", "Conta", {
                it: "Conto",
                nl: "Rekening",
                ja: "口座",
                ko: "계좌",
            }),
            amount: text("Amount", "Betrag", "Monto", "Montant", "Valor", {
                "es-ES": "Importe",
                it: "Importo",
                nl: "Bedrag",
                ja: "金額",
                ko: "금액",
            }),
            date: text("Date", "Datum", "Fecha", "Date", "Data", { it: "Data", nl: "Datum", ja: "日付", ko: "날짜" }),
            from: text("From", "Von", "Desde", "De", "De", { it: "Da", nl: "Van", ja: "元", ko: "출처" }),
            hide: text("Hide", "Ausblenden", "Ocultar", "Masquer", "Ocultar", {
                it: "Nascondi",
                nl: "Verbergen",
                ja: "非表示",
                ko: "숨기기",
            }),
            leave: text(
                "Leave them without one",
                "Ohne Kategorie lassen",
                "Dejarlos sin categoría",
                "Les laisser sans catégorie",
                "Deixar sem categoria",
                {
                    it: "Lasciali senza categoria",
                    nl: "Laat ze zonder categorie",
                    ja: "カテゴリなしのままにする",
                    ko: "카테고리 없이 두기",
                }
            ),
            leaveHint: text(
                "They still count in totals and balances.",
                "Sie zählen trotzdem in Summen und Kontoständen.",
                "Igual cuentan en los totales y saldos.",
                "Ils comptent quand même dans les totaux et les soldes.",
                "Continuam contando nos totais e saldos.",
                {
                    "pt-PT": "Continuam a contar nos totais e saldos.",
                    it: "Contano comunque nei totali e nei saldi.",
                    nl: "Ze tellen nog steeds mee in totalen en saldo's.",
                    ja: "合計と残高には含まれます。",
                    ko: "합계와 잔액에는 계속 포함돼요.",
                }
            ),
            makeTransfers: text(
                "Make them transfers",
                "Zu Umbuchungen machen",
                "Convertirlas en transferencias",
                "En faire des virements",
                "Transformar em transferências",
                {
                    it: "Trasformali in trasferimenti",
                    nl: "Maak er overboekingen van",
                    ja: "振替にする",
                    ko: "이체로 만들기",
                }
            ),
            more: text("{n} more", "{n} weitere", "{n} más", "{n} de plus", "mais {n}", {
                it: "Altri {n}",
                nl: "{n} meer",
                ja: "ほか{n}件",
                ko: "{n}건 더",
            }),
            noNote: text("No note", "Keine Notiz", "Sin nota", "Sans note", "Sem nota", {
                it: "Nessuna nota",
                nl: "Geen notitie",
                ja: "メモなし",
                ko: "메모 없음",
            }),
            note: text("Note", "Notiz", "Nota", "Note", "Nota", { it: "Nota", nl: "Notitie", ja: "メモ", ko: "메모" }),
            other: text(
                "Put them in Other",
                "In Sonstiges ablegen",
                "Ponerlos en Otros",
                "Les mettre dans Autre",
                "Colocar em Outros",
                { it: "Mettili in Altro", nl: "Zet ze in Overig", ja: "「その他」に入れる", ko: "기타로 넣기" }
            ),
            otherHint: text(
                "Expenses go to Other, income to Other income.",
                "Ausgaben kommen in Sonstiges, Einnahmen in Sonstige Einnahmen.",
                "Los gastos van a Otros, los ingresos a Otros ingresos.",
                "Les dépenses vont dans Autre, les revenus dans Autres revenus.",
                "As despesas vão para Outros, as receitas para Outras receitas.",
                {
                    it: "Le spese vanno in Altro, le entrate in Altre entrate.",
                    nl: "Uitgaven gaan naar Overig, inkomsten naar Overige inkomsten.",
                    ja: "支出は「その他」、収入は「その他の収入」に入ります。",
                    ko: "지출은 기타로, 수입은 기타 수입으로 들어가요.",
                }
            ),
            pairs: text(
                "{n} pairs look like a transfer",
                "{n} Paare sehen nach einer Umbuchung aus",
                "{n} pares parecen una transferencia",
                "{n} paires ressemblent à un virement",
                "{n} pares parecem uma transferência",
                {
                    it: "{n} coppie sembrano un trasferimento",
                    nl: "{n} paren lijken op een overboeking",
                    ja: "{n}組が振替に見えます",
                    ko: "{n}쌍이 이체로 보여요",
                }
            ),
            pairsHint: text(
                "Same day and amount, out of one account and into another.",
                "Gleicher Tag und Betrag, von einem Konto raus und auf ein anderes rein.",
                "Mismo día y monto, sale de una cuenta y entra en otra.",
                "Même jour et même montant, sortant d'un compte et entrant dans un autre.",
                "Mesmo dia e valor, sai de uma conta e entra em outra.",
                {
                    "es-ES": "Mismo día e importe, sale de una cuenta y entra en otra.",
                    it: "Stesso giorno e importo, in uscita da un conto e in entrata in un altro.",
                    nl: "Dezelfde dag en hetzelfde bedrag, van de ene rekening naar de andere.",
                    ja: "同じ日と金額で、ある口座から出て別の口座に入っています。",
                    ko: "같은 날 같은 금액이 한 계좌에서 나가 다른 계좌로 들어갔어요.",
                }
            ),
            rest: text("The other {n}", "Die anderen {n}", "Los otros {n}", "Les {n} autres", "Os outros {n}", {
                it: "Gli altri {n}",
                nl: "De andere {n}",
                ja: "残りの{n}件",
                ko: "나머지 {n}건",
            }),
            show: text("Show", "Anzeigen", "Mostrar", "Afficher", "Mostrar", {
                it: "Mostra",
                nl: "Tonen",
                ja: "表示",
                ko: "표시",
            }),
            subtitle: text(
                "Expenses {expense}, income {income}",
                "Ausgaben {expense}, Einnahmen {income}",
                "Gastos {expense}, ingresos {income}",
                "Dépenses {expense}, revenus {income}",
                "Despesas {expense}, receitas {income}",
                {
                    it: "Spese {expense}, entrate {income}",
                    nl: "Uitgaven {expense}, inkomsten {income}",
                    ja: "支出{expense}、収入{income}",
                    ko: "지출 {expense}, 수입 {income}",
                }
            ),
            title: text("No category", "Keine Kategorie", "Sin categoría", "Sans catégorie", "Sem categoria", {
                it: "Nessuna categoria",
                nl: "Geen categorie",
                ja: "カテゴリなし",
                ko: "카테고리 없음",
            }),
            to: text("To", "Nach", "Hasta", "Vers", "Para", { it: "A", nl: "Naar", ja: "振替先", ko: "받는 곳" }),
            treatAlike: text(
                "Treat them like the rest",
                "Wie den Rest behandeln",
                "Tratarlas como el resto",
                "Les traiter comme le reste",
                "Tratar como o resto",
                {
                    it: "Trattali come gli altri",
                    nl: "Behandel ze zoals de rest",
                    ja: "ほかと同じように扱う",
                    ko: "나머지와 똑같이 처리",
                }
            ),
        },
        wrong: {
            chooseOther: text(
                "Choose a different file",
                "Andere Datei wählen",
                "Elegir otro archivo",
                "Choisir un autre fichier",
                "Escolher outro arquivo",
                {
                    "pt-PT": "Escolher outro ficheiro",
                    it: "Scegli un altro file",
                    nl: "Kies een ander bestand",
                    ja: "別のファイルを選ぶ",
                    ko: "다른 파일 선택",
                }
            ),
            damaged: text("Damaged", "Beschädigt", "Dañado", "Endommagé", "Danificado", {
                it: "Danneggiato",
                nl: "Beschadigd",
                ja: "破損",
                ko: "손상됨",
            }),
            damagedBody: text(
                "Make a new backup and try again.",
                "Erstelle ein neues Backup und versuch es noch mal.",
                "Haz un respaldo nuevo e inténtalo de nuevo.",
                "Faites une nouvelle sauvegarde et réessayez.",
                "Faça um novo backup e tente de novo.",
                {
                    it: "Crea un nuovo backup e riprova.",
                    nl: "Maak een nieuwe back-up en probeer het opnieuw.",
                    ja: "バックアップを作り直して、もう一度お試しください。",
                    ko: "새 백업을 만들고 다시 시도해 주세요.",
                }
            ),
            damagedTitle: text(
                "This backup can't be read",
                "Dieses Backup kann nicht gelesen werden",
                "Este respaldo no se puede leer",
                "Cette sauvegarde est illisible",
                "Este backup não pode ser lido",
                {
                    it: "Impossibile leggere questo backup",
                    nl: "Deze back-up kan niet worden gelezen",
                    ja: "このバックアップは読み取れません",
                    ko: "이 백업을 읽을 수 없어요",
                }
            ),
            file: text("File", "Datei", "Archivo", "Fichier", "Arquivo", {
                "pt-PT": "Ficheiro",
                it: "File",
                nl: "Bestand",
                ja: "ファイル",
                ko: "파일",
            }),
            newer: text(
                "Newer version",
                "Neuere Version",
                "Versión más nueva",
                "Version plus récente",
                "Versão mais nova",
                { it: "Versione più recente", nl: "Nieuwere versie", ja: "新しいバージョン", ko: "더 최신 버전" }
            ),
            newerBody: text(
                "Reload Outlayr, then try again.",
                "Lade Outlayr neu und versuch es noch mal.",
                "Recarga Outlayr e inténtalo de nuevo.",
                "Rechargez Outlayr, puis réessayez.",
                "Recarregue o Outlayr e tente de novo.",
                {
                    it: "Ricarica Outlayr, poi riprova.",
                    nl: "Laad Outlayr opnieuw en probeer het dan nog eens.",
                    ja: "Outlayrを再読み込みして、もう一度お試しください。",
                    ko: "Outlayr를 새로고침한 뒤 다시 시도해 주세요.",
                }
            ),
            newerTitle: text(
                "This backup is from a newer version",
                "Dieses Backup stammt von einer neueren Version",
                "Este respaldo es de una versión más nueva",
                "Cette sauvegarde vient d'une version plus récente",
                "Este backup é de uma versão mais nova",
                {
                    it: "Questo backup proviene da una versione più recente",
                    nl: "Deze back-up komt van een nieuwere versie",
                    ja: "このバックアップは新しいバージョンのものです",
                    ko: "이 백업은 더 최신 버전에서 만들어졌어요",
                }
            ),
            notBackupBody: text(
                "Outlayr reads the .mmbackup file that Money Manager by Orange Dog creates.",
                "Outlayr liest die .mmbackup-Datei, die Money Manager von Orange Dog erstellt.",
                "Outlayr lee el archivo .mmbackup que crea Money Manager de Orange Dog.",
                "Outlayr lit le fichier .mmbackup que crée Money Manager d'Orange Dog.",
                "O Outlayr lê o arquivo .mmbackup criado pelo Money Manager da Orange Dog.",
                {
                    "pt-PT": "O Outlayr lê o ficheiro .mmbackup criado pelo Money Manager da Orange Dog.",
                    it: "Outlayr legge il file .mmbackup creato da Money Manager di Orange Dog.",
                    nl: "Outlayr leest het .mmbackup-bestand dat Money Manager van Orange Dog maakt.",
                    ja: "Outlayrは、Orange DogのMoney Managerが作成する.mmbackupファイルを読み取ります。",
                    ko: "Outlayr는 Orange Dog의 Money Manager가 만드는 .mmbackup 파일을 읽어요.",
                }
            ),
            notBackupTitle: text(
                "This isn't a Money Manager backup",
                "Das ist kein Money-Manager-Backup",
                "Esto no es un respaldo de Money Manager",
                "Ce n'est pas une sauvegarde Money Manager",
                "Este não é um backup do Money Manager",
                {
                    it: "Questo non è un backup di Money Manager",
                    nl: "Dit is geen back-up van Money Manager",
                    ja: "Money Managerのバックアップではありません",
                    ko: "Money Manager 백업이 아니에요",
                }
            ),
            notRead: text(
                "Not read, {size}",
                "Nicht gelesen, {size}",
                "Sin leer, {size}",
                "Non lu, {size}",
                "Não lido, {size}",
                {
                    it: "Non letto, {size}",
                    nl: "Niet gelezen, {size}",
                    ja: "未読み取り、{size}",
                    ko: "읽지 않음, {size}",
                }
            ),
            reasons: text("Other reasons", "Andere Gründe", "Otros motivos", "Autres raisons", "Outros motivos", {
                it: "Altri motivi",
                nl: "Andere redenen",
                ja: "その他の理由",
                ko: "기타 이유",
            }),
            realbyteBody: text(
                "It comes from Realbyte's Money Manager. Outlayr reads backups from Money Manager by Orange Dog.",
                "Sie stammt aus Money Manager von Realbyte. Outlayr liest Backups von Money Manager von Orange Dog.",
                "Viene de Money Manager de Realbyte. Outlayr lee respaldos de Money Manager de Orange Dog.",
                "Elle vient de Money Manager de Realbyte. Outlayr lit les sauvegardes de Money Manager d'Orange Dog.",
                "Ele vem do Money Manager da Realbyte. O Outlayr lê backups do Money Manager da Orange Dog.",
                {
                    "pt-PT": "Vem do Money Manager da Realbyte. O Outlayr lê cópias do Money Manager da Orange Dog.",
                    it: "Proviene da Money Manager di Realbyte. Outlayr legge i backup di Money Manager di Orange Dog.",
                    nl: "Hij komt van Money Manager van Realbyte. Outlayr leest back-ups van Money Manager van Orange Dog.",
                    ja: "RealbyteのMoney Managerのものです。OutlayrはOrange DogのMoney Managerのバックアップを読み取ります。",
                    ko: "Realbyte의 Money Manager에서 만든 파일이에요. Outlayr는 Orange Dog의 Money Manager 백업을 읽어요.",
                }
            ),
            realbyteTitle: text(
                "This backup is from a different Money Manager",
                "Dieses Backup stammt aus einem anderen Money Manager",
                "Este respaldo es de otro Money Manager",
                "Cette sauvegarde vient d'un autre Money Manager",
                "Este backup é de outro Money Manager",
                {
                    "pt-PT": "Esta cópia é de outro Money Manager",
                    it: "Questo backup proviene da un altro Money Manager",
                    nl: "Deze back-up komt van een andere Money Manager",
                    ja: "このバックアップは別のMoney Managerのものです",
                    ko: "이 백업은 다른 Money Manager에서 만들어졌어요",
                }
            ),
            title: text(
                "Can't read this file",
                "Diese Datei kann nicht gelesen werden",
                "No se puede leer este archivo",
                "Impossible de lire ce fichier",
                "Não foi possível ler este arquivo",
                {
                    "pt-PT": "Não foi possível ler este ficheiro",
                    it: "Impossibile leggere questo file",
                    nl: "Kan dit bestand niet lezen",
                    ja: "このファイルを読み取れません",
                    ko: "이 파일을 읽을 수 없어요",
                }
            ),
        },
    },
    key: "dashboard-import-mm",
} satisfies Dictionary;

export default dashboardImportMm;
