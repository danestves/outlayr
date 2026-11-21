import { describe, expect, it } from "vite-plus/test";

import { lint } from "./test-harness";

const messages = (diagnostics: { message: string }[]) => diagnostics.map(({ message }) => message);

describe("no-drizzle-transaction", () => {
    const drizzle = (source: string) => lint("no-drizzle-transaction", "apps/native/src/db/people.ts", source);

    it("reports drizzle's own transaction and names the replacement", () => {
        expect(
            messages(drizzle("export const save = (db) => db.transaction(async (tx) => tx.insert(people));"))
        ).toStrictEqual([
            "drizzle's `.transaction()` commits before an async callback runs. Use `withTransaction` from `@/db/transaction`.",
        ]);
    });

    it("leaves withTransaction and a computed key alone", () => {
        const source = `export const save = (db) => db.withTransaction(run);
export const computed = (db) => db["transaction"](run);
export const plain = (transaction) => transaction(run);
`;
        expect(drizzle(source)).toStrictEqual([]);
    });
});

describe("swiftui-list-grounds", () => {
    const grounds = (source: string) => lint("swiftui-list-grounds", "apps/native/src/screens/people.tsx", source);

    it("reports the missing ground a List never calls", () => {
        const source = `export const Screen = () => (
    <List style={groupedList()}>
        <Text>Hi</Text>
    </List>
);
`;
        expect(messages(grounds(source))).toStrictEqual([
            "This file renders <List> but never calls groupedRows(); the screen keeps iOS's own grey ground.",
        ]);
    });

    it("reports both grounds for a bare Form", () => {
        expect(messages(grounds("export const Screen = () => <Form><Text>Hi</Text></Form>;"))).toStrictEqual([
            "This file renders <Form> but never calls groupedList(); the screen keeps iOS's own grey ground.",
            "This file renders <Form> but never calls groupedRows(); the screen keeps iOS's own grey ground.",
        ]);
    });

    it("allows a List that applies both grounds", () => {
        const source = `export const Screen = () => (
    <List style={groupedList()} contentContainerStyle={groupedRows()}>
        <Text>Hi</Text>
    </List>
);
`;
        expect(grounds(source)).toStrictEqual([]);
    });
});

describe("bottom-sheet-background", () => {
    const sheet = (source: string) => lint("bottom-sheet-background", "apps/native/src/components/sheet.tsx", source);

    it("reports a value-imported BottomSheetModal with no backgroundStyle", () => {
        const source = `import { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
export const Sheet = () => <BottomSheetModal visible />;
`;
        expect(messages(sheet(source))).toStrictEqual([
            "This file presents a BottomSheetModal but sets no `backgroundStyle`; the sheet keeps the system material.",
        ]);
    });

    it("allows a painted sheet and a type-only import", () => {
        const painted = `import { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
export const Sheet = () => <BottomSheetModal visible backgroundStyle={{}} />;
`;
        const typed = `import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
export const ref: BottomSheetModal = null;
`;
        expect(sheet(painted)).toStrictEqual([]);
        expect(sheet(typed)).toStrictEqual([]);
    });
});

describe("no-sheet-repaint", () => {
    const repaint = (source: string) =>
        lint("no-sheet-repaint", "apps/native/src/components/import-sheet/step.tsx", source);

    it.each(["bg-background", "bg-surface", "bg-card", "bg-foreground/80"])(
        "reports %s inside the import sheet",
        (utility) => {
            expect(messages(repaint(`export const Step = () => <View className="${utility} p-4" />;`))).toStrictEqual([
                `\`${utility}\` re-paints the sheet's ground. The root's \`backgroundStyle\` owns it; content sits on that paper.`,
            ]);
        }
    );

    it("allows tokens that do not paint a sheet ground", () => {
        expect(repaint('export const Step = () => <View className="bg-primary bg-cardboard p-4" />;')).toStrictEqual(
            []
        );
    });
});

describe("widget-module-scope", () => {
    const widget = (source: string) => lint("widget-module-scope", "apps/native/src/widgets/streak.ts", source);

    it("reports a module-scope declaration beside the widget body", () => {
        const source = `const helper = () => 1;
export function Streak() {
    "widget";
    return helper();
}
`;
        expect(messages(widget(source))).toStrictEqual([
            "Module-scope declarations are out of reach of the widget's JSContext. Move it inside the widget body or pass it as a prop.",
        ]);
    });

    it("reports a second widget body in the same file", () => {
        const source = `export function One() {
    "widget";
    return null;
}
export function Two() {
    "widget";
    return null;
}
`;
        const reported = messages(widget(source));
        expect(reported).toHaveLength(2);
        expect(reported[0]).toContain("One widget per file");
    });

    it("allows one widget whose helpers live inside its body", () => {
        const source = `import { Text } from "swiftui";
export function Streak() {
    "widget";
    const label = 1;
    return Text(label);
}
`;
        expect(widget(source)).toStrictEqual([]);
    });
});

describe("editor-cta-busy", () => {
    const cta = (source: string) => lint("editor-cta-busy", "apps/native/src/screens/editor.tsx", source);

    it("reports an EditorCta without busy", () => {
        expect(messages(cta("export const Screen = () => <EditorCta onPress={save} />;"))).toStrictEqual([
            "<EditorCta> without `busy`: the save dims but never spins. Pass the form's submitting state.",
        ]);
    });

    it("allows an EditorCta that passes the submitting state", () => {
        expect(cta("export const Screen = () => <EditorCta onPress={save} busy={isSubmitting} />;")).toStrictEqual([]);
    });
});

describe("no-manual-memo", () => {
    const memoized = (source: string) => lint("no-manual-memo", "apps/native/src/screens/people.tsx", source);

    it.each([
        ["useMemo", "const value = useMemo(() => 1, []);"],
        ["useCallback", "const run = useCallback(() => 1, []);"],
        ["memo", "const Row = memo(() => null);"],
        ["React.useMemo", "const value = React.useMemo(() => 1, []);"],
    ])("reports %s", (name, call) => {
        const reported = messages(memoized(`export function useThing() {\n    ${call}\n    return null;\n}\n`));
        expect(reported).toHaveLength(1);
        expect(reported[0]).toContain(`Drop ${name.split(".").at(-1)}:`);
    });

    it("reports a memo directive", () => {
        expect(messages(memoized('"use no memo";\nexport const Row = () => null;'))).toStrictEqual([
            'Drop "use no memo": fix the code the compiler cannot prove safe instead of skipping it.',
        ]);
    });

    it("allows refs and lookalike names", () => {
        expect(
            memoized("export const useThing = () => useRef(null);\nexport const format = memoize(() => 1);")
        ).toStrictEqual([]);
    });
});

describe("no-hookless-use-function", () => {
    const hook = (source: string) => lint("no-hookless-use-function", "apps/native/src/lib/use-thing.ts", source);

    it("reports a hookless function declaration and arrow", () => {
        const source = `export function useThing() {
    return 1;
}
export const useOther = () => 2;
`;
        expect(messages(hook(source))).toStrictEqual([
            '"useThing" calls no hooks, so the React Compiler skips it and whatever it returns is rebuilt on every render. Rename it to a plain function, or read the hook it depends on inside it.',
            '"useOther" calls no hooks, so the React Compiler skips it and whatever it returns is rebuilt on every render. Rename it to a plain function, or read the hook it depends on inside it.',
        ]);
    });

    it("allows a use function that reads a hook, and a plain function", () => {
        const source = `import { useState } from "react";
export function useThing() {
    return useState(0);
}
export const formatThing = () => 2;
`;
        expect(hook(source)).toStrictEqual([]);
    });
});

describe("no-hermes-unsupported-apis", () => {
    const hermes = (source: string) => lint("no-hermes-unsupported-apis", "apps/native/src/lib/sort.ts", source);

    it.each([
        ["Array#toSorted", "export const sorted = (values) => values.toSorted();"],
        ["Intl.Segmenter", "export const segment = (text) => new Intl.Segmenter().segment(text);"],
    ])("reports %s", (name, source) => {
        expect(messages(hermes(source))).toStrictEqual([expect.stringContaining(`Hermes does not implement ${name}.`)]);
    });

    it("allows the copy methods and APIs Hermes ships", () => {
        const source = `export const reversed = (values) => [...values].toReversed();
export const spliced = (values) => values.toSpliced(0, 1);
export const formatter = Intl.DateTimeFormat;
`;
        expect(hermes(source)).toStrictEqual([]);
    });
});
