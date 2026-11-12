const pad = (part: number) => String(part).padStart(2, "0");

export function bankTextSample(today: Date) {
    const date = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`;
    const at = new Date(today);
    at.setHours(9, 41, 0, 0);
    return {
        amount: 1250,
        amountText: "Bs. 1250.0",
        at,
        bank: "Banesco",
        currency: "VES",
        income: true,
        name: "GOMEZ A",
        pieces: [
            { read: false, text: "BANESCO REGISTRO: Pago recibido a traves de Pago Movil de " },
            { read: true, text: "GOMEZ A" },
            { read: false, text: " por " },
            { read: true, text: "Bs. 1250.0" },
            { read: false, text: ` el ${date}; 09:41 REF 062400004512.` },
        ],
    } as const;
}
