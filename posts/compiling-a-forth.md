---
title: "Compiling a Forth"
date: "2025-10-06"
tags: ["forth"]
description: "A bytecode compiler and VM for a Forth-like language."
---

I was curious how Forth worked so I built a bytecode compiler and a VM for a Forth-like language, as well as some visualizations to show how it all works.

You don't need to know anything about Forth to follow along, aside from the fact it's a stack-oriented language.

Here's a small program that prints the number three.

```forth
3 .
```

The number (`3`) is pushed to the data stack, and then the dot (`.`) pops it from the data stack and prints it.

We'll need more Forth features than this to build interesting programs.

Forth has two built-in stacks. The data stack (sometimes just called "the stack") and the return stack. When a word is called in Forth (words are like functions) the address of the next instruction is pushed to the return stack. When the word finishes executing, the return stack is popped into the instruction pointer.

```forth
\ (1) word declaration
: PRINT10

  \ (3) the word body is executed
  10 .

  \ (4) ";" compiles an exit – at runtime it pops the return stack
  \     into the instruction pointer.
;

\   (2) instruction pointer lands on a word,
\       the next address is pushed to the return stack,
\       and the instruction pointer is set to the word address
PRINT10

\   (5) next address is executed
```

As well as words, my compiler also supports `DO`/`LOOP`s. These use the return stack too. When `DO` executes, it pops the limit and the iterator from the data stack and stores them in the return stack. This allows the inner loop to freely operate on the data stack. When `LOOP` executes, it pops the limit and iterator from the return stack, adds one to the iterator and compares it to the limit (and exits or loops again).

There are also variables, which can be declared with `VARIABLE X`, loaded with `X @`, and stored with `1 X !`.

Putting these features together, here's how you can build `10` by adding `1` repeatedly.

```forth
VARIABLE A

: RUN
  0 A !          \ initialize A
  10 0 DO        \ push limit and iterator for DO
                 \ DO places these on the return stack
    A @ 1 + A !  \ A = A + 1
  LOOP           \ increment i and exits when i == limit
  A @ .          \ prints 10
;

RUN
```

This set of features is enough for us to calculate numbers from the Fibonacci series, which is the example program I'll be using throughout the rest of this post.

## Tokenizing

Tokenization translates raw text into meaningful symbols.

To turn source code into tokens, we scan through the code, skipping over whitespace and appending tokens to a list. Syntax that's a single character is turned straight into a token but multi-character syntax needs to be grouped together. For example, entire comments are discarded, and while they are being discarded, we need to track that we're "within" a comment.

Identifiers, like keywords like `DO` or `LOOP`, or custom variables like `MYLONGVAR`, become single tokens.

First, a visualization of what's happening:

<div className="forth" id="tokenizer"></div>

And here's a trimmed version of my tokenizer:

```tsx
function tokenize(source: string): Token[] {
    const tokens: Token[] = [];

    let index = 0;
    while (index < source.length) {

        // Consume and discard everything on a line after '\'
        if (source[index] === "\\") {
            const commentStart = index;
            while (index < source.length && source[index] !== "\n") {
                index++;
            }
            index++;
            continue;
        }
        
        // Skip over whitespace
        if (isWhitespace(source[index])) {
            index++;
            continue;
        }
        
        if (source[index] === "@") {
            tokens.push({ type: "load" });
            index++;
            continue;
        }

        // Handle identifiers
        if (isLetter(source[index])) {
            const start = index;
            let value = "";
            while (isLetter(source[index])) {
                value += source[index];
                index++;
            }

            // Special-case the keywords
            if (value === "DO") {
                tokens.push({ type: "do" });
                continue;
            }
            if (value === "LOOP") {
                tokens.push({ type: "loop" });
                continue;
            }

            tokens.push({ type: "identifier", value });
            continue;
        }

        // .. trimmed other tokens, see source
    }

    return tokens;
}
```

With our list of tokens, we're ready to start generating bytecode for the VM.

## Generating Bytecode

Usually, in a compiler, the step after tokenization is called _parsing_ where an abstract syntax tree is built. However, the feature set of my Forth is so small, that I decided to generate bytecode directly from the list of tokens.

After bytecode generation, my VM needs two things:

- A list of operations for the VM's instruction pointer to navigate
- The number of variables that the program refers to

The latter tells the VM how many variables to allocate (a zero-initialized array). Variables in source (e.g., `A`, `B`) become integer indices into this array.

This means that my bytecode generation step needs to keep track of variables that have been seen before so that I can output the correct memory address (i.e. an index into the variable table).

I'll show the full list of bytecode operations and then a few of the steps for handling specific tokens.

```tsx
type Op = {
    op: "lit",     // Push value or address to DS
    value: number;
} | {
    op: "load",    // Pop address from DS, push value at address
} | {
    op: "store",   // Pop address from DS, pop value from DS, store value at address
} | {
    op: "dup2",    // Duplicate top two values on DS [a, b] -> [a, b, a, b]
} | {
    op: "add",     // Pop top two values from DS, push sum to DS
} | {
    op: "eq",      // Pop top two values from DS, push 1 if equal, 0 if not
} | {
    op: "jz",      // Pop value from DS, if zero, jump to address
    address: number;
} | {
    op: "jmp",     // Jump to address
    address: number;
} | {
    op: "call",    // Push IP to RS, jump to address
    address: number;
} | {
    op: "ret",     // Pop IP from RS, jump to IP
} | {
    op: "rs_push", // Pop from DS, push to RS
} | {
    op: "rs_pop",  // Pop from RS, push to DS
} | {
    op: "drop",    // Discard top value from DS
} | {
    op: "print",   // Pop value from DS, print it
}
```

The bytecode generation step scans through the list of tokens and, as it processes them, it appends to a list of bytecode and increments the variable count to set up the correct references.

Identifier tokens are either variable references, or words (function calls).

```tsx
function compile(tokens: Token[]) {

    // Bytecode that runs in the VM
    const bytecode: Bytecode[] = [];

    // Word -> bytecode offsets (for calls)
    const wordTable: { [key: string]: number } = {};

    // Variable -> memory address
    const variableTable: { [key: string]: number } = {};

    // ..

    let index = 0;
    while (index < tokens.length) {
        const token = tokens[index];
        
        if (token.type === "identifier") {
            if (token.value === "VARIABLE") {
                const nextToken = tokens[index + 1];

                // Store a binding of variable name to memory address
                variableTable[nextToken.value] = Object.keys(variableTable).length;
                index += 2;
                continue;
            }

            // If the variable has been declared as a word like `: FIB10`
            // then we have previously stored the bytecode offset which we
            // will set the instruction pointer to at runtime
            if (wordTable[token.value] !== undefined) {
                bytecode.push({ op: "call", address: wordTable[token.value] });
                index++;
                continue;
            }

            // If it's not a variable declaration, or a word, then we
            // look up the memory address
            bytecode.push({ op: "lit", value: variableTable[token.value] });
            index++;
            continue;
        }

        // ..
```

Setting up the `DO`/`LOOP` bytecode generation was the trickiest part of this project. It's a minefield of possible off-by-one errors. It's also not easy to read and understand but I've chosen to put it here anyway because even just glancing over it should help you understand how the loop variables (limit, iterator) and instruction pointer jumps are combined to execute loops in Forth.

```tsx
        // .. still inside compile()

        if (token.type === "do") {
            index++;
            
            // Expect: DS has [limit, start] (start is top)
            // Move both to RS: start then limit (RS top becomes limit)
            bytecode.push({ op: "rs_push" }) // start -> RS
            bytecode.push({ op: "rs_push" }) // limit -> RS

            // Mark first instruction of loop body
            loopStart.push(bytecode.length);
            continue;
        }
        
        if (token.type === "loop") {

            // Pop limit and i from RS (RS top is limit)
            bytecode.push({ op: "rs_pop" }) // limit -> DS
            bytecode.push({ op: "rs_pop" }) // i -> DS
        
            // Increment i
            bytecode.push({ op: "lit", value: 1 })
            bytecode.push({ op: "add" }) // i on DS
        
            // Duplicate i and limit for compare and possible restore
            bytecode.push({ op: "dup2" })
            bytecode.push({ op: "eq" }) // eq flag on DS
        
            const loopStartAddress = loopStart.pop(); // first instr of loop body
        
            // Branch: continue when not equal (eq==0), exit when equal
            const continueAddress = bytecode.length + 4; // skip equal-path (2 drops + jmp)
            bytecode.push({ op: "jz", address: continueAddress })
        
            // Equal path (fallthrough): cleanup and exit
            bytecode.push({ op: "drop" }) // drop i
            bytecode.push({ op: "drop" }) // drop limit
            const afterBlockAddress = bytecode.length + 1 /* jmp */ + 3 /* continue block */;
            bytecode.push({ op: "jmp", address: afterBlockAddress })
        
            // Continue path:
            // address == continueAddress
            bytecode.push({ op: "rs_push" }) // i -> RS (top)
            bytecode.push({ op: "rs_push" }) // limit -> RS
            bytecode.push({ op: "jmp", address: loopStartAddress })
        
            index++;
            continue;
        }

        // .. trimmed other tokens, see source
```

The rest of the token branches are more straightforward. Tokens like dot, store, load, and print all map directly to bytecode operations.

The colon token branch sets the bytecode offset for the word name which allows identifiers to become word calls as we saw above.

Now we've earned a visualization break.

<div className="forth" id="compiler"></div>

## VM

Writing the VM felt a little bit like dessert. Manually stepping through the bytecode as I worked on the generation logic gave me fairly good confidence that I was heading in the right direction, I only came across one or two off-by-one bugs when putting the VM together. Essentially, I had designed it ahead-of-time.

The VM scans through the bytecode operations using the instruction pointer (which starts at `0`). The instruction pointer can jump around as it encounters `jmp` (jump to offset) or `jz` (conditional jump).

It manages the data stack, return stack, and the variable table (i.e. memory addresses).

<div className="forth" id="vm"></div>

Here's a trimmed version of the VM:

```tsx
function vm(program: Program) => {
    const dataStack: number[] = [];
    const returnStack: number[] = [];
    const variableTable: number[] = new Array(program.variableCount).fill(0);

    let ip = 0;
    while (ip < program.bytecode.length) {
        const cur = program.bytecode[ip];

        if (cur.op === "lit") {
            dataStack.push(cur.value); // Literal or memory address
            ip++;
            continue;
        } else if (cur.op === "store") {
            const address = dsPop();
            const value = dsPop();
            variableTable[address] = value;
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
        }
        
        // .. trimmed other ops, see source
    }
}
```

The code for my compiler and VM are [embedded in this website](https://github.com/healeycodes/healeycodes.com/blob/main/components/visuals/forth/components.tsx). I've been iterating on it by just running the TypeScript file:

```bash
bun ./components/visuals/forth/components.tsx
55  # 10th Fibonacci number
```

The visuals are React components with sleeps. In order to display the progress of the different steps (tokenizing, bytecode generation, VM), I first got each working and then added a callback which takes the current data and then sleeps.

So the VM function is actually async and accepts this callback:

```tsx
// VM
async function vm(program: Program, callback:
  (
    highlight: { ip: number },
    dataStack: number[],
    returnStack: number[],
    variableTable: number[]
  ) => Promise<void>) {
  
  // .. inside VM loop
  await callback({ ip }, dataStack, returnStack, variableTable);
  // ..
  
}
```

And the component calls it and passes `setState` functions:

```tsx
// Component
export function VM() {

    // .. inside useEffect
    await vm(program, async (highlight, newDataStack, newReturnStack, newVariableTable) => {
        setHighlightIP(highlight.ip);
        setDataStack([...newDataStack]);
        setReturnStack([...newReturnStack]);
        setVariableTable([...newVariableTable]);
        await new Promise(resolve => setTimeout(resolve, 500));
    });
    // ..
    
}
```

For the Forth code snippets in this post, I had to write [a Prism plugin](https://github.com/healeycodes/healeycodes.com/blob/main/lib/prism-forth.js) to get syntax highlighting working. Now that I've learned how to do this, I'll be using this method for syntax highlighting for the more esoteric (or, original) programming languages I write about!

## Discrepancies

I described my compiler/VM as _Forth-like_ because it's a little bit different from how Forth works.

My implementation compiles to bytecode ahead-of-time. Forth is traditionally interactive. Words are interpreted and executed as they are entered, and only colon definitions are compiled. Forth uses threaded code where words contain lists of addresses pointing to other words instead of a different bytecode offset.

Real Forth uses a dynamic dictionary that can be altered at runtime with new variables or word definitions. As I mentioned earlier, my word bodies are compiled with jump-over logic in the main execution stream. Also, my variables compile to `lit address` operations but real Forth variables return their address when executed directly.

These are just a few of the differences but I feel like my Forth-like compiler and VM capture enough of the spirit of Forth!
