import { useState, useEffect, ReactNode, CSSProperties } from 'react';

// Shared terminal styling
const terminalStyles = `
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
    .bytecode {
        white-space: nowrap;
        display: inline-block;
        min-width: max-content;
    }
    .terminal :global(.ch) {
        display: inline-block;
        width: 1ch;
    }
    .terminal :global(.comment) {
        color: var(--dim);
    }
    :global(.ch.hl) {
        background: #e5e7eb !important;
        color: #111827 !important;
        border-radius: 2px;
    }
    :global(.ch.hl-start) {
        background: #e5e7eb !important;
        color: #111827 !important;
        border-radius: 2px 0 0 2px;
    }
    :global(.ch.hl-mid) {
        background: #e5e7eb !important;
        color: #111827 !important;
    }
    :global(.ch.hl-end) {
        background: #e5e7eb !important;
        color: #111827 !important;
        border-radius: 0 2px 2px 0;
    }
    .separator {
        height: 1px;
        background: rgba(255, 255, 255, 0.3);
        margin: 12px 0;
    }
    .source-section, .tokens-section, .bytecode-section {
        margin-top: 8px;
    }
    .tokens-label, .section-label {
        color: var(--dim);
        margin-bottom: 4px;
    }
    .token-line, .bytecode-line {
        font-family: inherit;
        line-height: 1.25;
        min-height: 1.25em;
    }
    .token-line.highlighted, .bytecode-line.highlighted {
        background: var(--fg);
        color: var(--bg);
        border-radius: 2px;
    }
`;

const fib10 = `VARIABLE A
VARIABLE B
VARIABLE T

           \\ calculates the nth Fibonacci number
: FIB      \\ ( n -- f_n )
  0 A !
  1 B !
  0        \\ start index
  DO       \\ ( limit start -- )
     A @ B @ + T !
     B @ A !
     T @ B !
  LOOP
  A @
;

10 FIB .
`

type LiteralToken = {
    type: "literal";
    value: number;
}

type SymbolToken = {
    type: "store" | "load" | "dot" | "colon" | "semicolon" | "add" | "do" | "loop";
}

type IdentifierToken = {
    type: "identifier";
    value: string;
}

type Token = LiteralToken | SymbolToken | IdentifierToken;

async function tokenize(source: string, callback: (highlight: { start: number, end: number }, tokens: Token[]) => Promise<void>): Promise<Token[]> {
    const tokens: Token[] = [];

    const isWhitespace = (c: string) => {
        return c === " " || c === "\n" || c === "\t";
    }
    const isDigit = (c: string) => {
        return c >= "0" && c <= "9";
    }
    const isLetter = (c: string) => {
        return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";
    }

    let index = 0;
    while (index < source.length) {
        await callback({ start: index, end: index + 1 }, tokens);

        if (source[index] === "\\") {
            const commentStart = index;
            while (index < source.length && source[index] !== "\n") {
                index++;
                await callback({ start: commentStart, end: index }, tokens);
            }
            index++;
            await callback({ start: commentStart, end: index }, tokens);
            continue;
        }
        if (isWhitespace(source[index])) {
            index++;
            continue;
        }
        if (source[index] === ":") {
            tokens.push({ type: "colon" });
            await callback({ start: index, end: index + 1 }, tokens);
            index++;
            continue;
        }
        if (source[index] === ";") {
            tokens.push({ type: "semicolon" });
            await callback({ start: index, end: index + 1 }, tokens);
            index++;
            continue;
        }
        if (source[index] === ".") {
            tokens.push({ type: "dot" });
            await callback({ start: index, end: index + 1 }, tokens);
            index++;
            continue;
        }
        if (source[index] === "!") {
            tokens.push({ type: "store" });
            await callback({ start: index, end: index + 1 }, tokens);
            index++;
            continue;
        }
        if (source[index] === "@") {
            tokens.push({ type: "load" });
            await callback({ start: index, end: index + 1 }, tokens);
            index++;
            continue;
        }
        if (isDigit(source[index])) {
            const start = index;
            let value = "";
            while (isDigit(source[index])) {
                value += source[index];
                index++;
            }
            tokens.push({ type: "literal", value: parseInt(value) });
            await callback({ start, end: index }, tokens);
            continue;
        }
        if (isLetter(source[index])) {
            const start = index;
            let value = "";
            while (isLetter(source[index])) {
                value += source[index];
                index++;
            }

            if (value === "DO") {
                tokens.push({ type: "do" });
                await callback({ start, end: index }, tokens);
                continue;
            }
            if (value === "LOOP") {
                tokens.push({ type: "loop" });
                await callback({ start, end: index }, tokens);
                continue;
            }

            tokens.push({ type: "identifier", value });
            await callback({ start, end: index }, tokens);
            continue;
        }
        if (source[index] === "+") {
            tokens.push({ type: "add" });
            await callback({ start: index, end: index + 1 }, tokens);
            index++;
            continue;
        }

        throw new Error(`Unexpected token at index ${index}: ${source[index]}`);
    }

    return tokens;
}

type Op = {
    op: "lit", // Push value or address to DS
    value: number;
} | {
    op: "load", // Pop address from DS, push value at address
} | {
    op: "store", // Pop address from DS, pop value from DS, store value at address
} | {
    op: "dup2", // Duplicate top two values on DS [a, b] -> [a, b, a, b]
} | {
    op: "add", // Pop top two values from DS, push sum to DS
} | {
    op: "eq", // Pop top two values from DS, push 1 if equal, 0 if not
} | {
    op: "jz", // Pop value from DS, if zero, jump to address
    address: number;
} | {
    op: "jmp", // Jump to address
    address: number;
} | {
    op: "call", // Push IP to RS, jump to address
    address: number;
} | {
    op: "ret", // Pop IP from RS, jump to IP
} | {
    op: "rs_push", // Pop from DS, push to RS
} | {
    op: "rs_pop", // Pop from RS, push to DS
} | {
    op: "drop", // Discard top value from DS
} | {
    op: "print", // Pop value from DS, print it
}

type Bytecode = Op;
type Program = {
    bytecode: Bytecode[];
    variableCount: number;
}

async function compile(tokens: Token[], callback: (highlight: { tokenIdxStart: number, tokenIdxEnd: number }, ops: Bytecode[]) => Promise<void>): Promise<Program> {
    const bytecode: Bytecode[] = [];
    const wordTable: { [key: string]: number } = {};
    const variableTable: { [key: string]: number } = {};
    let currentWordSkipOp: Bytecode | null = null;
    let loopStart: number[] = [];

    let index = 0;
    while (index < tokens.length) {
        const token = tokens[index];
        if (token.type === "identifier") {
            if (token.value === "VARIABLE") {
                const nextToken = tokens[index + 1];
                if (nextToken.type !== "identifier") {
                    throw new Error(`Expected identifier after VARIABLE at index ${index}: ${JSON.stringify(nextToken)}`);
                }
                variableTable[nextToken.value] = Object.keys(variableTable).length;
                await callback({ tokenIdxStart: index, tokenIdxEnd: index + 2 }, bytecode);
                index += 2;
                continue;
            }

            if (wordTable[token.value] !== undefined) {
                bytecode.push({ op: "call", address: wordTable[token.value] });
                await callback({ tokenIdxStart: index, tokenIdxEnd: index + 1 }, bytecode);
                index++;
                continue;
            }

            bytecode.push({ op: "lit", value: variableTable[token.value] }); // Address
            await callback({ tokenIdxStart: index, tokenIdxEnd: index + 1 }, bytecode);
            index++;
            continue;
        }
        if (token.type === "colon") {
            index++;
            const nextToken = tokens[index];
            if (nextToken.type !== "identifier") {
                throw new Error(`Expected identifier after colon at index ${index}: ${JSON.stringify(nextToken)}`);
            }
            if (currentWordSkipOp !== null) {
                throw new Error(`Expected semicolon before next word at index ${index}: ${JSON.stringify(nextToken)}`);
            }

            currentWordSkipOp = { op: "jmp", address: -1 };
            bytecode.push(currentWordSkipOp);
            await callback({ tokenIdxStart: index - 1, tokenIdxEnd: index + 1 }, bytecode);
            wordTable[nextToken.value] = bytecode.length;
            index++;
            continue;
        }
        if (token.type === "semicolon") {
            if (currentWordSkipOp === null) {
                throw new Error(`Expected word before semicolon at index ${index}: ${JSON.stringify(token)}`);
            }
            bytecode.push({ op: "ret" });
            await callback({ tokenIdxStart: index, tokenIdxEnd: index + 1 }, bytecode);

            currentWordSkipOp.address = bytecode.length;
            currentWordSkipOp = null;
            index++;
            continue;
        }

        if (token.type === "do") {
            index++;
            // Expect: DS has [limit, start] (start is top)
            // Move both to RS: start then limit (RS top becomes limit)
            bytecode.push({ op: "rs_push" }) // start -> RS
            await callback({ tokenIdxStart: index - 1, tokenIdxEnd: index }, bytecode);
            bytecode.push({ op: "rs_push" }) // limit -> RS
            await callback({ tokenIdxStart: index - 1, tokenIdxEnd: index }, bytecode);
            // Mark first instruction of loop body
            loopStart.push(bytecode.length);
            continue;
        }

        if (token.type === "loop") {
            if (loopStart.length === 0) {
                throw new Error(`Loop without do at index ${index}: ${JSON.stringify(token)}`);
            }

            // Pop limit and i from RS (RS top is limit)
            bytecode.push({ op: "rs_pop" }) // limit -> DS
            await callback({ tokenIdxStart: index, tokenIdxEnd: index + 1 }, bytecode);
            bytecode.push({ op: "rs_pop" }) // i -> DS
            await callback({ tokenIdxStart: index, tokenIdxEnd: index + 1 }, bytecode);

            // Increment i
            bytecode.push({ op: "lit", value: 1 })
            await callback({ tokenIdxStart: index, tokenIdxEnd: index + 1 }, bytecode);
            bytecode.push({ op: "add" }) // i on DS
            await callback({ tokenIdxStart: index, tokenIdxEnd: index + 1 }, bytecode);

            // Duplicate i and limit for compare and possible restore
            bytecode.push({ op: "dup2" })
            await callback({ tokenIdxStart: index, tokenIdxEnd: index + 1 }, bytecode);
            bytecode.push({ op: "eq" }) // eq flag on DS
            await callback({ tokenIdxStart: index, tokenIdxEnd: index + 1 }, bytecode);

            const loopStartAddress = loopStart.pop()!; // first instr of loop body

            // Branch: continue when not equal (eq==0), exit when equal
            const continueAddress = bytecode.length + 4; // skip equal-path (2 drops + jmp)
            bytecode.push({ op: "jz", address: continueAddress })
            await callback({ tokenIdxStart: index, tokenIdxEnd: index + 1 }, bytecode);

            // Equal path (fallthrough): cleanup and exit
            bytecode.push({ op: "drop" }) // drop i
            await callback({ tokenIdxStart: index, tokenIdxEnd: index + 1 }, bytecode);
            bytecode.push({ op: "drop" }) // drop limit
            await callback({ tokenIdxStart: index, tokenIdxEnd: index + 1 }, bytecode);
            const afterBlockAddress = bytecode.length + 1 /* jmp */ + 3 /* continue block */;
            bytecode.push({ op: "jmp", address: afterBlockAddress })
            await callback({ tokenIdxStart: index, tokenIdxEnd: index + 1 }, bytecode);

            // Continue path:
            // address == continueAddress
            bytecode.push({ op: "rs_push" }) // i -> RS (top)
            await callback({ tokenIdxStart: index, tokenIdxEnd: index + 1 }, bytecode);
            bytecode.push({ op: "rs_push" }) // limit -> RS
            await callback({ tokenIdxStart: index, tokenIdxEnd: index + 1 }, bytecode);
            bytecode.push({ op: "jmp", address: loopStartAddress })
            await callback({ tokenIdxStart: index, tokenIdxEnd: index + 1 }, bytecode);

            index++;
            continue;
        }

        if (token.type === "literal") {
            bytecode.push({ op: "lit", value: token.value });
            await callback({ tokenIdxStart: index, tokenIdxEnd: index + 1 }, bytecode);
            index++;
            continue;
        }
        if (token.type === "store") {
            bytecode.push({ op: "store" });
            await callback({ tokenIdxStart: index, tokenIdxEnd: index + 1 }, bytecode);
            index++;
            continue;
        }
        if (token.type === "load") {
            bytecode.push({ op: "load" });
            await callback({ tokenIdxStart: index, tokenIdxEnd: index + 1 }, bytecode);
            index++;
            continue;
        }
        if (token.type === "add") {
            bytecode.push({ op: "add" });
            await callback({ tokenIdxStart: index, tokenIdxEnd: index + 1 }, bytecode);
            index++;
            continue;
        }
        if (token.type === "dot") {
            bytecode.push({ op: "print" });
            await callback({ tokenIdxStart: index, tokenIdxEnd: index + 1 }, bytecode);
            index++;
            continue;
        }

        throw new Error(`Unexpected token at index ${index}: ${JSON.stringify(token)}`);
    }

    return { bytecode, variableCount: Object.keys(variableTable).length };
}

async function vm(program: Program, callback: (highlight: { ip: number }, dataStack: number[], returnStack: number[], variableTable: number[]) => Promise<void>) {
    const dataStack: number[] = [];
    const returnStack: number[] = [];
    const variableTable: number[] = new Array(program.variableCount).fill(0);

    const dsPop = () => {
        const value = dataStack.pop();
        if (value === undefined) {
            throw new Error("Data stack underflow");
        }
        return value;
    }
    const rsPop = () => {
        const value = returnStack.pop();
        if (value === undefined) {
            throw new Error("Return stack underflow");
        }
        return value;
    }

    let ip = 0;
    while (ip < program.bytecode.length) {
        const cur = program.bytecode[ip];

        await callback({ ip }, dataStack, returnStack, variableTable);

        if (cur.op === "lit") {
            dataStack.push(cur.value);
            ip++;
            continue;
        } else if (cur.op === "store") {
            const address = dsPop();
            const value = dsPop();
            variableTable[address] = value;
            ip++;
            continue;
        } else if (cur.op === "load") {
            const address = dsPop();
            dataStack.push(variableTable[address]);
            ip++;
            continue;
        } else if (cur.op === "jmp") {
            ip = cur.address;
            continue;
        } else if (cur.op === "jz") {
            if (dsPop() === 0) {
                ip = cur.address;
                continue;
            }
            ip++;
            continue;
        } else if (cur.op === "call") {
            ip++
            returnStack.push(ip);
            ip = cur.address;
            continue;
        } else if (cur.op === "ret") {
            ip = rsPop();
            continue;
        } else if (cur.op === "rs_push") {
            returnStack.push(dsPop());
            ip++;
            continue;
        } else if (cur.op === "rs_pop") {
            dataStack.push(rsPop());
            ip++;
            continue;
        } else if (cur.op === "add") {
            dataStack.push(dsPop() + dsPop());
            ip++;
            continue;
        } else if (cur.op === "dup2") {
            if (dataStack.length < 2) {
                throw new Error("Data stack underflow");
            }
            const top = dataStack[dataStack.length - 1];
            const secondFromTop = dataStack[dataStack.length - 2];
            // Duplicate in-order: [a, b] -> [a, b, a, b]
            dataStack.push(secondFromTop);
            dataStack.push(top);
            ip++;
            continue;
        } else if (cur.op === "eq") {
            dataStack.push(dsPop() === dsPop() ? 1 : 0);
            ip++;
            continue;
        } else if (cur.op === "drop") {
            dsPop();
            ip++;
            continue;
        } else if (cur.op === "print") {
            console.log(dsPop());
            ip++;
            continue;
        }

        // @ts-expect-error lints for missing branches
        throw new Error(`Unknown opcode: ${cur.op}`);
    }
}

const TOKENIZER_WAIT_TIME = 150;
const TOKENIZER_FINISH_TIME = 2000;

export function Tokenizer() {
    const [terminal, setTerminal] = useState<React.ReactNode>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            while (!cancelled) {
                await runTokenizer(() => cancelled, (node) => {
                    setTerminal(node);
                });
                await new Promise((resolve) => setTimeout(resolve, TOKENIZER_FINISH_TIME));
            }
        })();

        return () => {
            cancelled = true;
        }
    }, []);

    return (
        <div>{terminal}</div>
    );
}

async function runTokenizer(shouldStop: () => boolean, setTerminal: (node: React.ReactNode) => void) {
    const tokens: Token[] = [];
    let highlight = { start: 0, end: 0 };

    try {
        await tokenize(fib10, async (newHighlight, newTokens) => {
            if (shouldStop()) {
                return;
            }
            
            highlight = newHighlight;
            tokens.splice(0, tokens.length, ...newTokens);
            
            const terminalNode = renderTokenizer(highlight, tokens);
            setTerminal(terminalNode);
            
            await new Promise(resolve => setTimeout(resolve, TOKENIZER_WAIT_TIME));
        });
    } catch (error) {
        console.error('[runTokenizer] Tokenization error:', error);
    }
}

function renderTokenizer(highlight: { start: number, end: number }, tokens: Token[]): React.ReactNode {
    const charNodes: ReactNode[] = [];
    let inComment = false;

    const getHighlightClass = (i: number) => {
        if (i < highlight.start || i >= highlight.end) return '';
        if (highlight.end - highlight.start === 1) return ' hl';
        if (i === highlight.start) return ' hl-start';
        if (i === highlight.end - 1) return ' hl-end';
        return ' hl-mid';
    };

    for (let i = 0; i < fib10.length; i++) {
        const ch = fib10[i];

        if (ch === '\n') {
            inComment = false;
            charNodes.push(<br key={`br-${i}`} />);
            continue;
        }

        if (ch === '\\') {
            inComment = true;
        }

        const highlightClass = getHighlightClass(i);
        const commentClass = inComment ? ' comment' : '';
        const classes = `ch${highlightClass}${commentClass}`;

        let inlineStyle: CSSProperties = {
            display: 'inline-block',
            width: '1ch'
        };

        if (inComment) {
            inlineStyle.color = '#9ca3af';
        }

        if (highlightClass) {
            inlineStyle.background = '#e5e7eb';
            inlineStyle.color = '#111827';

            if (highlightClass === ' hl') {
                inlineStyle.borderRadius = '2px';
            } else if (highlightClass === ' hl-start') {
                inlineStyle.borderRadius = '2px 0 0 2px';
            } else if (highlightClass === ' hl-end') {
                inlineStyle.borderRadius = '0 2px 2px 0';
            }
        }

        charNodes.push(
            <span key={`ch-${i}`} className={classes} style={inlineStyle}>{ch === ' ' ? '\u00A0' : ch}</span>
        );
    }

    const latestTokens = tokens.slice(-5);

    const renderTokenLine = (i: number) => {
        if (i < latestTokens.length) {
            const token = latestTokens[i];
            const tokenIndex = tokens.length - latestTokens.length + i;
            let tokenStr = '';
            let prefix = '';
            if (token.type === 'literal') {
                tokenStr = token.value.toString();
                prefix = 'literal';
            } else if (token.type === 'identifier') {
                tokenStr = token.value;
                prefix = 'identifier';
            } else {
                tokenStr = token.type.toUpperCase();
                prefix = 'symbol';
            }

            const indexPart = `${tokenIndex.toString().padStart(2, '\u00A0')}:`;
            const valuePart = `\u00A0${tokenStr}`;
            const prefixPart = `(${prefix})`;
            const totalBeforePrefix = indexPart.length + valuePart.length;
            const paddingNeeded = Math.max(0, 14 - totalBeforePrefix);
            const padding = '\u00A0'.repeat(paddingNeeded);

            return (
                <div key={i} className="token-line">
                    <span style={{ color: 'var(--dim)' }}>{indexPart}</span>
                    <span>{valuePart}</span>
                    <span>{padding}</span>
                    <span style={{ color: 'var(--dim)' }}>{prefixPart}</span>
                </div>
            );
        } else {
            return (
                <div key={i} className="token-line">
                    <span style={{ color: 'var(--dim)' }}>{i.toString().padStart(2, '\u00A0')}:</span>
                </div>
            );
        }
    };

    return (
        <div className="terminal">
            <div className="source-section">
                <div className="section-label">Source Code</div>
                <div className="bytecode">{charNodes}</div>
            </div>
            <div className="separator"></div>
            <div className="tokens-section">
                <div className="tokens-label">Tokens</div>
                {Array.from({ length: 5 }, (_, i) => renderTokenLine(i))}
            </div>
            <style jsx>{terminalStyles}</style>
        </div>
    );
}

const COMPILER_WAIT_TIME = 500;
const COMPILER_FINISH_TIME = 2000;

export function Compiler() {
    const [terminal, setTerminal] = useState<React.ReactNode>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            while (!cancelled) {
                await runCompiler(() => cancelled, (node) => {
                    setTerminal(node);
                });
                await new Promise((resolve) => setTimeout(resolve, COMPILER_FINISH_TIME));
            }
        })();

        return () => {
            cancelled = true;
        }
    }, []);

    return (
        <div>{terminal}</div>
    );
}

async function runCompiler(shouldStop: () => boolean, setTerminal: (node: React.ReactNode) => void) {
    let tokens: Token[] = [];
    let bytecode: Bytecode[] = [];
    let highlightRange = { start: -1, end: -1 };

    try {
        // First tokenize the source
        const allTokens = await tokenize(fib10, async () => {
            // No-op callback for tokenization, just need the tokens
        });

        if (shouldStop()) {
            return;
        }

        tokens = allTokens;

        // Then compile with highlighting
        await compile(allTokens, async (highlight, newBytecode) => {
            if (shouldStop()) {
                return;
            }
            
            highlightRange = { start: highlight.tokenIdxStart, end: highlight.tokenIdxEnd };
            bytecode = [...newBytecode];
            
            const terminalNode = renderCompiler(highlightRange, tokens, bytecode);
            setTerminal(terminalNode);
            
            await new Promise(resolve => setTimeout(resolve, COMPILER_WAIT_TIME));
        });
    } catch (error) {
        console.error('[runCompiler] Compilation error:', error);
    }
}

function renderCompiler(highlightRange: { start: number, end: number }, tokens: Token[], bytecode: Bytecode[]): React.ReactNode {
    const visibleTokenCount = 10;
    let startIndex = 0;

    if (highlightRange.start >= 0 && tokens.length > 0) {
        const maxVisibleIndex = startIndex + visibleTokenCount - 1;
        if (highlightRange.start > maxVisibleIndex) {
            startIndex = Math.max(0, highlightRange.start - visibleTokenCount + 1);
        }
    }

    const visibleTokens = tokens.slice(startIndex, startIndex + visibleTokenCount);

    const renderTokenLine = (i: number) => {
        if (i < visibleTokens.length) {
            const token = visibleTokens[i];
            const tokenIndex = startIndex + i;
            const isHighlighted = tokenIndex >= highlightRange.start && tokenIndex < highlightRange.end;

            let tokenStr = '';
            let prefix = '';
            if (token.type === 'literal') {
                tokenStr = token.value.toString();
                prefix = 'literal';
            } else if (token.type === 'identifier') {
                tokenStr = token.value;
                prefix = 'identifier';
            } else {
                tokenStr = token.type.toUpperCase();
                prefix = 'symbol';
            }

            const indexPart = `${tokenIndex.toString().padStart(2, '\u00A0')}:`;
            const valuePart = `\u00A0${tokenStr}`;
            const prefixPart = `(${prefix})`;
            const totalBeforePrefix = indexPart.length + valuePart.length;
            const paddingNeeded = Math.max(0, 14 - totalBeforePrefix);
            const padding = '\u00A0'.repeat(paddingNeeded);

            return (
                <div key={i} className={`token-line${isHighlighted ? ' highlighted' : ''}`}>
                    <span style={{ color: 'var(--dim)' }}>{indexPart}</span>
                    <span>{valuePart}</span>
                    <span>{padding}</span>
                    <span style={{ color: 'var(--dim)' }}>{prefixPart}</span>
                </div>
            );
        } else {
            return (
                <div key={i} className="token-line">
                    <span style={{ color: 'var(--dim)' }}>{(startIndex + i).toString().padStart(2, '\u00A0')}:</span>
                </div>
            );
        }
    };

    const latestBytecode = bytecode.slice(-10);
    const renderBytecodeLine = (i: number) => {
        if (i < latestBytecode.length) {
            const op = latestBytecode[i];
            const opIndex = bytecode.length - latestBytecode.length + i;

            let opStr = '';
            if (op.op === 'lit') {
                opStr = `lit ${op.value}`;
            } else if (op.op === 'jz') {
                opStr = `jz ${op.address}`;
            } else if (op.op === 'jmp') {
                opStr = `jmp ${op.address}`;
            } else if (op.op === 'call') {
                opStr = `call ${op.address}`;
            } else {
                opStr = op.op;
            }

            const indexPart = `${opIndex.toString().padStart(2, '\u00A0')}:`;
            const valuePart = `\u00A0${opStr}`;

            return (
                <div key={i} className="bytecode-line">
                    <span style={{ color: 'var(--dim)' }}>{indexPart}</span>
                    <span>{valuePart}</span>
                </div>
            );
        } else {
            return (
                <div key={i} className="bytecode-line">
                    <span style={{ color: 'var(--dim)' }}>{i.toString().padStart(2, '\u00A0')}:</span>
                </div>
            );
        }
    };

    return (
        <div className="terminal">
            <div className="tokens-section">
                <div className="section-label">Tokens</div>
                {Array.from({ length: 10 }, (_, i) => renderTokenLine(i))}
            </div>
            <div className="separator"></div>
            <div className="bytecode-section">
                <div className="section-label">Bytecode</div>
                {Array.from({ length: 10 }, (_, i) => renderBytecodeLine(i))}
            </div>
            <style jsx>{terminalStyles}</style>
        </div>
    );
}

const VM_WAIT_TIME = 750;
const VM_FINISH_TIME = 2000;

export function VM() {
    const [terminal, setTerminal] = useState<React.ReactNode>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            while (!cancelled) {
                await runVM(() => cancelled, (node) => {
                    setTerminal(node);
                });
                await new Promise((resolve) => setTimeout(resolve, VM_FINISH_TIME));
            }
        })();

        return () => {
            cancelled = true;
        }
    }, []);

    return (
        <div>{terminal}</div>
    );
}

async function runVM(shouldStop: () => boolean, setTerminal: (node: React.ReactNode) => void) {
    let bytecode: Bytecode[] = [];
    let highlightIP = -1;
    let dataStack: number[] = [];
    let returnStack: number[] = [];
    let variableTable: number[] = [];

    try {
        // First tokenize and compile to get the program
        const allTokens = await tokenize(fib10, async () => {
            // No-op
        });

        if (shouldStop()) {
            return;
        }

        const program = await compile(allTokens, async () => {
            // No-op
        });

        if (shouldStop()) {
            return;
        }

        bytecode = program.bytecode;

        // Run the VM with highlighting
        await vm(program, async (highlight, newDataStack, newReturnStack, newVariableTable) => {
            if (shouldStop()) {
                return;
            }
            
            highlightIP = highlight.ip;
            dataStack = [...newDataStack];
            returnStack = [...newReturnStack];
            variableTable = [...newVariableTable];
            
            const terminalNode = renderVM(highlightIP, bytecode, dataStack, returnStack, variableTable);
            setTerminal(terminalNode);
            
            await new Promise(resolve => setTimeout(resolve, VM_WAIT_TIME));
        });
    } catch (error) {
        console.error('[runVM] VM execution error:', error);
    }
}

function renderVM(highlightIP: number, bytecode: Bytecode[], dataStack: number[], returnStack: number[], variableTable: number[]): React.ReactNode {
    const visibleBytecodeCount = 15;
    let startIndex = 0;

    if (highlightIP >= 0 && bytecode.length > 0) {
        const maxVisibleIndex = startIndex + visibleBytecodeCount - 1;
        if (highlightIP > maxVisibleIndex) {
            startIndex = Math.max(0, highlightIP - Math.floor(visibleBytecodeCount / 2));
        } else if (highlightIP < startIndex) {
            startIndex = Math.max(0, highlightIP - Math.floor(visibleBytecodeCount / 2));
        }
        if (startIndex + visibleBytecodeCount > bytecode.length) {
            startIndex = Math.max(0, bytecode.length - visibleBytecodeCount);
        }
    }

    const visibleBytecode = bytecode.slice(startIndex, startIndex + visibleBytecodeCount);

    const renderBytecodeLine = (i: number) => {
        if (i < visibleBytecode.length) {
            const op = visibleBytecode[i];
            const opIndex = startIndex + i;
            const isHighlighted = opIndex === highlightIP;

            let opStr = '';
            if (op.op === 'lit') {
                opStr = `lit ${op.value}`;
            } else if (op.op === 'jz') {
                opStr = `jz ${op.address}`;
            } else if (op.op === 'jmp') {
                opStr = `jmp ${op.address}`;
            } else if (op.op === 'call') {
                opStr = `call ${op.address}`;
            } else {
                opStr = op.op;
            }

            const indexPart = `${opIndex.toString().padStart(2, '\u00A0')}:`;
            const valuePart = `\u00A0${opStr}`;

            return (
                <div key={i} className={`bytecode-line${isHighlighted ? ' highlighted' : ''}`}>
                    <span style={{ color: 'var(--dim)' }}>{indexPart}</span>
                    <span>{valuePart}</span>
                </div>
            );
        } else {
            return (
                <div key={i} className="bytecode-line">
                    <span style={{ color: 'var(--dim)' }}>{(startIndex + i).toString().padStart(2, '\u00A0')}:</span>
                </div>
            );
        }
    };

    const formatStack = (stack: number[]) => {
        const displayStack = stack.slice(-5).reverse();
        const lines: ReactNode[] = [];

        for (let i = 0; i < 5; i++) {
            if (i < displayStack.length) {
                const value = displayStack[i];
                const stackIndex = stack.length - 1 - i;
                lines.push(
                    <div key={i} className="token-line">
                        <span style={{ color: 'var(--dim)' }}>{stackIndex.toString().padStart(2, ' ')}:</span>
                        <span> {value}</span>
                    </div>
                );
            } else {
                lines.push(
                    <div key={i} className="token-line">
                        <span style={{ color: 'var(--dim)' }}>   </span>
                    </div>
                );
            }
        }

        return lines;
    };

    const formatVariables = () => {
        const lines: ReactNode[] = [];

        for (let i = 0; i < variableTable.length; i++) {
            const value = variableTable[i];
            lines.push(
                <div key={i} className="token-line">
                    <span style={{ color: 'var(--dim)' }}>{i.toString().padStart(2, ' ')}:</span>
                    <span> {value}</span>
                </div>
            );
        }

        return lines;
    };

    return (
        <div className="terminal">
            <div className="bytecode-section">
                <div className="section-label">Bytecode</div>
                {Array.from({ length: visibleBytecodeCount }, (_, i) => renderBytecodeLine(i))}
            </div>
            <div className="separator"></div>
            <div className="tokens-section">
                <div className="section-label">VM State</div>
                <div style={{ display: 'flex', gap: '24px' }}>
                    <div style={{ flex: 1 }}>
                        <div className="tokens-label">Data Stack</div>
                        {formatStack(dataStack)}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div className="tokens-label">Return Stack</div>
                        {formatStack(returnStack)}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div className="tokens-label">Variables</div>
                        {formatVariables()}
                    </div>
                </div>
            </div>
            <style jsx>{terminalStyles}</style>
        </div>
    );
}

// When this file is ran with `bun` this outputs the 10th Fibonacci number (55)
if ('Bun' in globalThis && globalThis.Bun.main.includes('forth')) {
    tokenize(fib10, async (_, __) => { /* no-op */ })
        .then(tokens => {
            compile(tokens, async (_, __) => { /* no-op */ })
                .then(program => {
                    vm(program, async (_, __, ___, ____) => { /* no-op */ });
                });
        });
}
