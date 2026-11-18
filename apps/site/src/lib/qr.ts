const BLOCKS_M = [
    { blocks: 1, data: 16, ec: 10 },
    { blocks: 1, data: 28, ec: 16 },
    { blocks: 1, data: 44, ec: 26 },
    { blocks: 2, data: 32, ec: 18 },
    { blocks: 2, data: 43, ec: 24 },
    { blocks: 4, data: 27, ec: 16 },
] as const;

interface Grid {
    cells: boolean[];
    size: number;
}

function grid(size: number): Grid {
    return { cells: Array.from({ length: size * size }, () => false), size };
}

function read(target: Grid, x: number, y: number) {
    return target.cells[y * target.size + x] ?? false;
}

function write(target: Grid, x: number, y: number, dark: boolean) {
    target.cells[y * target.size + x] = dark;
}

function rows(target: Grid) {
    return Array.from({ length: target.size }, (_, y) => target.cells.slice(y * target.size, (y + 1) * target.size));
}

function multiply(x: number, y: number) {
    let z = 0;
    for (let bit = 7; bit >= 0; bit -= 1) {
        z = (z << 1) ^ ((z >>> 7) * 0x1_1d);
        z ^= ((y >>> bit) & 1) * x;
    }
    return z;
}

function divisor(degree: number) {
    const result = Array.from({ length: degree }, (_, index): number => (index === degree - 1 ? 1 : 0));
    let root = 1;
    for (let step = 0; step < degree; step += 1) {
        for (let index = 0; index < degree; index += 1) {
            result[index] = multiply(result[index] ?? 0, root) ^ (result[index + 1] ?? 0);
        }
        root = multiply(root, 2);
    }
    return result;
}

function remainder(data: readonly number[], generator: readonly number[]) {
    const result = generator.map(() => 0);
    for (const byte of data) {
        const factor = byte ^ (result.shift() ?? 0);
        result.push(0);
        for (const [index, coefficient] of generator.entries()) {
            result[index] = (result[index] ?? 0) ^ multiply(coefficient, factor);
        }
    }
    return result;
}

function codewords(bytes: Uint8Array) {
    const spec = BLOCKS_M.find(({ blocks, data }) => 12 + bytes.length * 8 <= blocks * data * 8);
    if (!spec) {
        throw new Error(`QR payload of ${bytes.length} bytes is longer than version 6 holds`);
    }
    const { blocks, data, ec } = spec;
    const capacity = blocks * data * 8;
    const bits: number[] = [];
    const push = (value: number, length: number) => {
        for (let bit = length - 1; bit >= 0; bit -= 1) {
            bits.push((value >>> bit) & 1);
        }
    };
    push(0b0100, 4);
    push(bytes.length, 8);
    for (const byte of bytes) {
        push(byte, 8);
    }
    push(0, Math.min(4, capacity - bits.length));
    push(0, (8 - (bits.length % 8)) % 8);
    for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) {
        push(pad, 8);
    }
    const all = Array.from({ length: bits.length / 8 }, (_, index) =>
        bits.slice(index * 8, index * 8 + 8).reduce((byte, bit) => (byte << 1) | bit, 0)
    );
    const generator = divisor(ec);
    const split = Array.from({ length: blocks }, (_, index) => all.slice(index * data, index * data + data));
    const corrections = split.map((block) => remainder(block, generator));
    const interleaved: number[] = [];
    for (let column = 0; column < data; column += 1) {
        interleaved.push(...split.map((block) => block[column] ?? 0));
    }
    for (let column = 0; column < ec; column += 1) {
        interleaved.push(...corrections.map((block) => block[column] ?? 0));
    }
    return { interleaved, version: BLOCKS_M.indexOf(spec) + 1 };
}

function functionPatterns(version: number) {
    const size = 17 + version * 4;
    const modules = grid(size);
    const reserved = grid(size);
    const set = (x: number, y: number, dark: boolean) => {
        write(modules, x, y, dark);
        write(reserved, x, y, true);
    };
    for (let index = 0; index < size; index += 1) {
        set(6, index, index % 2 === 0);
        set(index, 6, index % 2 === 0);
    }
    const finder = (cx: number, cy: number) => {
        for (let dy = -4; dy <= 4; dy += 1) {
            for (let dx = -4; dx <= 4; dx += 1) {
                const x = cx + dx;
                const y = cy + dy;
                if (x >= 0 && x < size && y >= 0 && y < size) {
                    const ring = Math.max(Math.abs(dx), Math.abs(dy));
                    set(x, y, ring !== 2 && ring !== 4);
                }
            }
        }
    };
    finder(3, 3);
    finder(size - 4, 3);
    finder(3, size - 4);
    if (version > 1) {
        const at = size - 7;
        for (let dy = -2; dy <= 2; dy += 1) {
            for (let dx = -2; dx <= 2; dx += 1) {
                set(at + dx, at + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
            }
        }
    }
    for (let index = 0; index < 9; index += 1) {
        write(reserved, index, 8, true);
        write(reserved, 8, index, true);
    }
    for (let index = 0; index < 8; index += 1) {
        write(reserved, size - 1 - index, 8, true);
        write(reserved, 8, size - 1 - index, true);
    }
    set(8, size - 8, true);
    return { modules, reserved, size };
}

const MASKS: readonly ((x: number, y: number) => boolean)[] = [
    (x, y) => (x + y) % 2 === 0,
    (_, y) => y % 2 === 0,
    (x) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function drawFormat(modules: Grid, mask: number) {
    const { size } = modules;
    let rest = mask;
    for (let step = 0; step < 10; step += 1) {
        rest = (rest << 1) ^ ((rest >>> 9) * 0x5_37);
    }
    const bits = ((mask << 10) | rest) ^ 0x54_12;
    const bit = (index: number) => ((bits >>> index) & 1) === 1;
    for (let index = 0; index <= 5; index += 1) {
        write(modules, 8, index, bit(index));
    }
    write(modules, 8, 7, bit(6));
    write(modules, 8, 8, bit(7));
    write(modules, 7, 8, bit(8));
    for (let index = 9; index < 15; index += 1) {
        write(modules, 14 - index, 8, bit(index));
    }
    for (let index = 0; index < 8; index += 1) {
        write(modules, size - 1 - index, 8, bit(index));
    }
    for (let index = 8; index < 15; index += 1) {
        write(modules, 8, size - 15 + index, bit(index));
    }
}

function runPenalty(line: readonly boolean[]) {
    let score = 0;
    let run = 1;
    for (let index = 1; index <= line.length; index += 1) {
        if (index < line.length && line[index] === line[index - 1]) {
            run += 1;
        } else {
            if (run >= 5) {
                score += run - 2;
            }
            run = 1;
        }
    }
    const text = line.map((dark) => (dark ? "1" : "0")).join("");
    for (const pattern of ["10111010000", "00001011101"]) {
        for (let at = text.indexOf(pattern); at !== -1; at = text.indexOf(pattern, at + 1)) {
            score += 40;
        }
    }
    return score;
}

function penalty(modules: Grid) {
    const { size } = modules;
    let score = 0;
    let dark = 0;
    for (let y = 0; y < size; y += 1) {
        score += runPenalty(Array.from({ length: size }, (_, x) => read(modules, x, y)));
        score += runPenalty(Array.from({ length: size }, (_, x) => read(modules, y, x)));
        for (let x = 0; x < size; x += 1) {
            const cell = read(modules, x, y);
            dark += cell ? 1 : 0;
            if (
                x < size - 1 &&
                y < size - 1 &&
                cell === read(modules, x + 1, y) &&
                cell === read(modules, x, y + 1) &&
                cell === read(modules, x + 1, y + 1)
            ) {
                score += 3;
            }
        }
    }
    const total = size * size;
    return score + (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
}

export function qrModules(text: string): readonly (readonly boolean[])[] {
    const { interleaved, version } = codewords(new TextEncoder().encode(text));
    const { modules: base, reserved, size } = functionPatterns(version);
    let cursor = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
        const column = right === 6 ? 5 : right;
        const upward = ((column + 1) & 2) === 0;
        for (let step = 0; step < size; step += 1) {
            const y = upward ? size - 1 - step : step;
            for (const x of [column, column - 1]) {
                if (!read(reserved, x, y) && cursor < interleaved.length * 8) {
                    write(base, x, y, (((interleaved[cursor >>> 3] ?? 0) >>> (7 - (cursor & 7))) & 1) === 1);
                    cursor += 1;
                }
            }
        }
        right = column;
    }
    const candidates = MASKS.map((test, mask) => {
        const modules: Grid = {
            cells: base.cells.map((dark, index) =>
                reserved.cells[index] ? dark : dark !== test(index % size, Math.floor(index / size))
            ),
            size,
        };
        drawFormat(modules, mask);
        return { modules, score: penalty(modules) };
    });
    return rows(candidates.reduce((best, candidate) => (candidate.score < best.score ? candidate : best)).modules);
}
