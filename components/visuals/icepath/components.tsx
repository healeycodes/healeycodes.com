import { SetStateAction, useEffect, useState } from "react";

const WAIT_TIME = 100;
const FINISH_TIME = 1000;

const helloWorld = `###########################
# @ o |           > & ! ± #
#                         #
#     l           h       #
#     > & l & e & ^       #
###########################
`

const fibonacci = `##################################################
# @ > 9 1 + 1 0 |  |                           < #
#               >  > : ! ~ ; + R 1 - : 0 = R R ^ #
#                                        ±       #
##################################################
`

const ladder = `###################
# @ 3 5 8 |       #
#         > ~   ‖ #
###################
# ‖           R < #
###################
`

export const HelloWorld = () => {
    return <IcePath fp="hello.ice" program={helloWorld} />
}

export const Fibonacci = () => {
    return <IcePath fp="fibonacci.ice" program={fibonacci} />
}

export const Ladder = () => {
    return <IcePath fp="ladder.ice" program={ladder} />
}

const IcePath = ({ fp, program }: { fp: string, program: string }) => {
    const [terminal, setTerminal] = useState<React.ReactNode>(null);
    useEffect(() => {
        let cancelled = false;
        (async () => {
            while (!cancelled) {
                await run(fp, program, () => cancelled, (node) => setTerminal(node));
                await new Promise((resolve) => setTimeout(resolve, FINISH_TIME));
            }
        })();

        return () => {
            cancelled = true;
        }
    }, [fp, program]);

    return (
        <div>{terminal}</div>
    );
}

// Coordinates are { x, y }. Access as grid[x][y].
type Cursor = { x: number; y: number; dir: number };
const UP = 0;
const RIGHT = 1;
const DOWN = 2;
const LEFT = 3;

// Search for '@' in program and return the cursor position
function findInit(grid: string[][]): Cursor {
    for (let x = 0; x < grid.length; x++) {
        for (let y = 0; y < (grid[x] ?? []).length; y++) {
            if ((grid[x] ?? [])[y] === "@") {
                return { x, y, dir: RIGHT };
            }
        }
    }
    throw new Error("No @ found");
}

// Apply direction to cursor
function move(cursor: Cursor): Cursor {
    switch (cursor.dir) {
        case UP:
            cursor.y--;
            return cursor;
        case RIGHT:
            cursor.x++;
            return cursor;
        case DOWN:
            cursor.y++;
            return cursor;
        case LEFT:
            cursor.x--;
            return cursor;
    }
    throw new Error("Invalid direction");
}

function pop(stack: (string | number)[]): string | number {
    const top = stack.pop();
    if (top === undefined) {
        throw new Error("Stack is empty");
    }
    return top;
}

let lastOp: Record<string, string> = {};
async function render(fp: string, file: string, cursor: Cursor, stack: (string | number)[], stdout: (string | number)[], setTerminal: (nodes: SetStateAction<React.ReactNode[]>) => void) {
    const idx = cursor.x + cursor.y * (file.indexOf('\n') + 1);
    const op = file[idx] ? opMap[file[idx]] : undefined;

    if (op && op !== lastOp[fp]) {
        lastOp[fp] = op;
    }

    const charNodes: React.ReactNode[] = [];
    for (let i = 0; i < file.length; i++) {
        const ch = file[i];
        if (ch === '\n') {
            charNodes.push(<br key={`br-${i}`} />);
            continue;
        }
        const isCursor = i === idx;
        const isWall = ch === '#';
        const classes = `ch${isCursor ? ' hl' : ''}${isWall ? ' wall' : ''}`;
        charNodes.push(
            <span key={`ch-${i}`} className={classes}>{ch === ' ' ? '\u00A0' : ch}</span>
        );
    }

    const view = (
        <div className="terminal">
            <div className="grid">{charNodes}</div>
            <div className="meta">
                <div className="line"><span className="label">Last Op</span><span className="sep">: </span><span className="value">{lastOp[fp] || ''}</span></div>
                <div className="line"><span className="label">Stack</span><span className="sep">: </span><span className="value">{stack.join(', ')}</span></div>
                <div className="line"><span className="label">Stdout</span><span className="sep">: </span><span className="value">{stdout.join(', ')}</span></div>
                <div className="line"><span className="label">Program</span><span className="sep">: </span><span className="value">{fp}</span></div>
            </div>
            <style jsx>{`
                .terminal {
                    --bg: #111827;
                    --fg: #e5e7eb;
                    --dim: #9ca3af;
                    background: var(--bg);
                    color: var(--fg);
                    font-family: "IBM Plex Mono", monospace;
                    font-size: 14px;
                    line-height: 1.25;
                    padding: 12px 14px;
                    border-radius: 0.4em;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    width: 100%;
                    max-width: 100%;
                    overflow: auto;
                    overscroll-behavior: contain;
                }
                .grid {
                    margin-bottom: 8px;
                    white-space: nowrap;
                    display: inline-block;
                    min-width: max-content;
                }
                .terminal :global(.ch) {
                    display: inline-block;
                    width: 1ch;
                }
                .terminal :global(.wall) {
                    color: var(--dim);
                }
                .terminal :global(.hl) {
                    background: var(--fg);
                    color: var(--bg);
                    border-radius: 2px;
                }
                .terminal :global(.hl.wall) {
                    color: var(--bg);
                }
                .meta .line {
                    margin: 2px 0;
                }
                .meta .label {
                    color: var(--dim);
                }
            `}</style>
        </div>
    );

    setTerminal([view]);

    await new Promise((resolve) => setTimeout(resolve, WAIT_TIME));
}

const opMap: Record<string, string> = {
    '@': 'START',
    '|': 'DOWN',
    '>': 'RIGHT',
    '<': 'LEFT',
    '^': 'UP',
    'R': 'ROT',
    ':': 'DUP',
    ';': 'DUP2',
    '~': 'SWAP',
    '=': 'EQ',
    '+': 'ADD',
    '-': 'SUB',
    '&': 'JOIN',
    '!': 'PRINT',
    '±': 'EXIT',
}

async function run(fp: string, file: string, shouldStop: () => boolean, setTerminal: (nodes: React.ReactNode) => void) {
    const rawLines = file.split("\n").map((line) => line.split(""));
    const width = Math.max(0, ...rawLines.map((r) => r.length));
    const height = rawLines.length;
    const grid = Array.from({ length: width }, (_, x) =>
        Array.from({ length: height }, (_, y) => rawLines[y]?.[x])
    ); // grid[x][y]

    const stack: (string | number)[] = [];
    let cursor: Cursor = findInit(grid);
    let stdout: (string | number)[] = [];

    let exit = false
    while (true) {
        if (shouldStop()) {
            break;
        }

        await render(fp, file, cursor, stack, stdout, setTerminal as (nodes: React.SetStateAction<React.ReactNode[]>) => void);

        // Make sure to render before exiting
        if (exit) {
            break;
        }

        cursor = move(cursor);
        const nextChar = grid[cursor.x]?.[cursor.y];

        if (nextChar === undefined) {
            throw new Error(`Out of bounds x=${cursor.x}, y=${cursor.y}`);
        }

        if (nextChar === " ") {
            continue;
        }

        // Handle ladder climbing (teleport to other ladder)
        if (nextChar === "‖") {
            const otherLadder = findOtherLadder(grid, cursor);
            cursor.x = otherLadder.x;
            cursor.y = otherLadder.y;
            continue;
        }

        // Handle direction change
        if (nextChar === "|") {
            cursor.dir = DOWN;
            continue;
        } else if (nextChar === ">") {
            cursor.dir = RIGHT;
            continue;
        } else if (nextChar === "<") {
            cursor.dir = LEFT;
            continue;
        } else if (nextChar === "^") {
            cursor.dir = UP;
            continue;
        }

        // ROT (3-element rotation) a b c -> b c a
        if (nextChar === "R") {
            const a = pop(stack);
            const b = pop(stack);
            const c = pop(stack);
            stack.push(b);
            stack.push(a);
            stack.push(c);
            continue;
        }

        // Duplicate second to top
        if (nextChar === ";") {
            const second = stack[stack.length - 2];
            if (second === undefined) {
                throw new Error("Stack has less than 2 elements");
            }
            stack.push(second);
            continue;
        }

        // Duplicate top of stack
        if (nextChar === ":") {
            const top = pop(stack);
            stack.push(top);
            stack.push(top);
            continue;
        }

        // Swap top two
        if (nextChar === "~") {
            const a = pop(stack);
            const b = pop(stack);
            stack.push(a);
            stack.push(b);
            continue;
        }

        // Equals (true == DOWN, false == NO-OP)
        if (nextChar === "=") {
            const a = pop(stack);
            const b = pop(stack);
            if (a === b) {
                cursor.dir = DOWN;
            }
            continue;
        }

        // Pop two and add as number
        if (nextChar === "+") {
            const a = pop(stack);
            const b = pop(stack);
            if (typeof a !== "number" || typeof b !== "number") {
                throw new Error(`Invalid number: ${a} ${b}`);
            }
            stack.push(a + b);
            continue;
        }

        // Pop two and subtract as number
        if (nextChar === "-") {
            const a = pop(stack);
            const b = pop(stack);
            if (typeof a !== "number" || typeof b !== "number") {
                throw new Error(`Invalid number: ${a} ${b}`);
            }
            stack.push(b - a);
            continue;
        }

        // Pop two and join as string
        if (nextChar === "&") {
            stack.push([pop(stack), pop(stack)].join(""));
            continue;
        }

        // Pop and print
        if (nextChar === "!") {
            stdout.push(pop(stack));
            continue;
        }

        // Exit
        if (nextChar === "±") {
            exit = true;
            console.log(stdout);
            continue;
        }

        // Push to stack
        if (nextChar.match(/[0-9]/)) {
            stack.push(Number(nextChar));
        } else {
            stack.push(nextChar);
        }
    }
}

function findOtherLadder(grid: string[][], cursor: Cursor): Cursor {
    const ladders = grid.flatMap((row, x) =>
        row.map((ch, y) => ({ x, y, ch }))
    ).filter(cell => cell.ch === "‖");
    const otherLadder = ladders.find(l => !(l.x === cursor.x && l.y === cursor.y));
    if (!otherLadder) {
        throw new Error("No other ladder found");
    }
    return { x: otherLadder.x, y: otherLadder.y, dir: cursor.dir };
}
