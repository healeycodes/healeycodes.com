---
title: "Compiling Lisp to Bytecode and Running It"
date: "2024-10-15"
tags: ["rust"]
description: "Extending my Lisp compiler and adding a fast virtual machine."
---

Before this, the only virtual machine (VM) I had written was for Advent of Code. [Day 8 of 2020](https://adventofcode.com/2020/day/8) asks you to write a program to evaluate a list of instructions so that you can help fix a kid's game console. The puzzle input looks like this:

```text
nop +0
acc +1
jmp +4
acc +3
jmp -3
acc -99
acc +1
jmp -4
acc +6
```

There are three kinds of instructions here. `acc +1` increases a single global value by one, `jmp +4` jumps to the instruction 4 steps ahead, and `nop` stands for *no operation* so it does nothing.

This is a nice example of simple [bytecode](https://en.wikipedia.org/wiki/Bytecode) — a low-level representation of code that can be executed by a VM. The control flow depends on [jump instructions](https://en.wikipedia.org/wiki/JMP_\(x86_instruction\)) which perform an unconditional jump to another instruction.

In previous posts, I walked through [compiling Lisp to JavaScript](https://healeycodes.com/lisp-to-javascript-compiler) and [explored some optimizations](https://healeycodes.com/lisp-compiler-optimizations). This time, I'm taking a different approach: compiling Lisp to bytecode and running it in a custom VM. You don't need to have read my previous posts to follow along!

## Running Bytecode

In [a recent commit](https://github.com/healeycodes/lisp-to-js/commit/c5252e313ad2aa7024363317aaccae3b296d4e57) to [lisp-to-js](https://github.com/healeycodes/lisp-to-js), I added the option to compile Lisp code to bytecode and run it in a [stack-based](https://en.wikipedia.org/wiki/Stack_machine) VM. My Lisp variant is quite simple (based on [Little Lisp](https://maryrosecook.com/blog/post/little-lisp-interpreter)). Below, I have a small program and the bytecode it produces.

*Note: these examples are shown without optimization, as some optimizations would reduce the bytecode to a single `push_const` instruction.* 

```lisp
(+ 1 2 8)

; 0: push_const 1.0
; 1: push_const 2.0
; 2: push_const 8.0
; 3: add 3
```

This program has a single expression that sums three numbers.

In the commented bytecode, the number on the left, `0:`, is the instruction position. The zeroth instruction, `push_const 1.0`, pushes `1.0` onto the stack.

Before the final instruction runs, the stack looks like this: `[1.0, 2.0, 8.0]`. The final instruction, `add 3`, pops all three values from the stack, adds them together, and pushes the result onto the stack.

After this program runs, the stack contains a single value: `[11.0]`.

I've trimmed the VM code that doesn't run to show the basic structure:

```rust
fn byte_code_vm(
    byte_code: Vec<ByteCodeInstruction>,
    stack: &mut Vec<StackValue>,
) -> Result<(), RuntimeError> {

    // Start at the first instruction
    let mut position: usize = 0;

    while position < byte_code.len() {
    
        // Fetch current instruction
        let instruction = &byte_code[position];

        match instruction {
            ByteCodeInstruction::PushConst(value) => stack.push(StackValue::Number(*value)),
            ByteCodeInstruction::Add(n) => {
            
                // Pop n values off the stack
                let values: Vec<StackValue> = stack.split_off(stack.len() - n);

                // Sum them up
                let sum: f64 = values
                    .into_iter()
                    .map(|v| match v {
                        StackValue::Number(num) => num,
                        _ => unreachable!(),
                    })
                    .sum();

                // Push the result back onto the stack
                stack.push(StackValue::Number(sum));
            }
        }

        // Move to the next instruction
        position += 1;
    }

    Ok(())
}
```

Let's take a look at an example with jump instructions. My bytecode compiler inserts jump instructions so that if-expressions can alter the flow of execution. The argument to the jump instruction is the absolute position rather than a relative offset.

```lisp
(if (< 1 2)
  (print 1)
  (print 2)
 )

;  0: push_const 1.0
;  1: push_const 2.0
;  2: less_than
;  3: jump 8 // go to 8
;  4: push_const 1.0
;  5: load_var print
;  6: call_lambda 1
;  7: jump 11 // exit
;  8: push_const 2.0
;  9: load_var print
; 10: call_lambda 1
```

An if-expression is compiled into these parts:

- Conditional check
- A jump instruction for skipping the true branch
- The true branch instructions
- A jump instruction for skipping the false branch
- The false branch instructions

During execution, only one branch runs. When the conditional check is true, it increases the position by two, causing the true branch to run followed by skipping over the false branch. When the check is false, the position is incremented by one and we jump directly to the false branch.

There are some instructions here that we haven't seen yet. `less_than` pops two values from the stack and compares them (here, that's `1.0` and `2.0`), and the true branch uses `load_var` to load a variable from the stack frame. In this case, a built-in function called `print`.

In order to call a built-in function, or a closure, we use `call_lambda` followed by the number of arguments we're consuming from the stack. Here, we're passing a single argument, `1.0`.

I've got one more example which shows the final feature of my VM: closures.

```lisp
(let ((fib (lambda (n)
    (if (< n 2)
        n
        (+ (fib (- n 1)) (fib (- n 2)))))))
(print (fib 10)))

; 0: push_closure ["n"]
;   ->   0: load_var n
;   ->   1: push_const 2.0
;   ->   2: less_than
;   ->   3: jump 6 // go to 6
;   ->   4: load_var n
;   ->   5: jump 17 // exit
;   ->   6: load_var n
;   ->   7: push_const 1.0
;   ->   8: sub 2
;   ->   9: load_var fib
;   ->  10: call_lambda 1
;   ->  11: load_var n
;   ->  12: push_const 2.0
;   ->  13: sub 2
;   ->  14: load_var fib
;   ->  15: call_lambda 1
;   ->  16: add 2
; 1: store_var fib
; 2: push_const 10.0
; 3: load_var fib
; 4: call_lambda 1
; 5: load_var print
; 6: call_lambda 1
```

This program prints the 10th Fibonacci number using recursive calls. I like using this program to benchmark interpreters and compilers because it spawns many functions.

I won't go through this step by step but I'll explain the `push_closure` instruction.

In order to represent user-defined functions, they are stored in bytecode as a closure. They have two parts — a list of parameters that are passed in by the `call_lambda` instruction, and some bytecode to execute.

When `push_closure` runs, this entire closure is pushed onto the stack, and it can then be stored in the current stack frame using `store_var`.

A closure needs to be on the stack in order to be executed by `call_lambda`. It's pushed onto the stack by calling `load_var` on a variable that points to a closure.

When execution enters a closure, a child stack frame is created with the arguments that were popped from the stack by `call_lambda`. The child stack frame allows local variables to be set (and discarded after the closure). If the variable isn't found in the current stack frame, the VM looks for it in parent frames, working its way up through the nested stack frames until it either finds the variable or reaches the top.

```rust
struct StackFrame {

    // Handle shared ownership and interior mutability of stack frames,
    // which allows child frames to reference their parent frames during execution
    parent: Option<Rc<RefCell<StackFrame>>>,
    variables: HashMap<String, StackValue>,
}

impl StackFrame {

    // Create a child frame for a closure
    fn child(parent: Rc<RefCell<StackFrame>>) -> Rc<RefCell<StackFrame>> {
        Rc::new(RefCell::new(StackFrame {
            parent: Some(parent),
            variables: HashMap::new(),
        }))
    }

    // Look up a variable
    fn look_up(&self, variable: &str) -> Result<StackValue, RuntimeError> {
        match self.variables.get(variable) {
            Some(value) => Ok(value.clone()),
            None => match &self.parent {
                Some(parent) => parent.borrow().look_up(variable),
                None => Err(RuntimeError::new(&format!(
                    "unknown variable: {}",
                    variable
                ))),
            },
        }
    }
}
```

## Generating Bytecode

After parsing, and an optional optimization pass, the compiler produces an Abstract Syntax Tree (AST) representing the Lisp expressions that need to be processed into bytecode.

The functions that process these expressions are recursive in nature (an if-expression can contain other if-expressions). As they run, they append bytecode to a list.
Below is an example of how an if-expression is compiled into bytecode. This function takes the AST node representing the if-expression, compiles its condition, true branch, and false branch, and appends the corresponding bytecode instructions onto a list.

```rust
fn compile_byte_code_if(if_expr: &IfExpression, bytecode: &mut Vec<ByteCodeInstruction>) {

    // Compile the condition expression
    compile_byte_code_expression(&if_expr.check, bytecode);

    // Placeholder index for jump_if_false, to be patched later
    let jump_if_false_pos = bytecode.len();
    
    // Placeholder for jump to start of false branch if condition is false
    bytecode.push(ByteCodeInstruction::Jump(0)); 

    // Compile the true branch
    compile_byte_code_expression(&if_expr.r#true, bytecode);

    // Placeholder index for jump_over_false,
    // to skip the false branch after true branch is executed
    let jump_over_false_pos = bytecode.len();
    
    // Placeholder for jump over false branch after true branch
    bytecode.push(ByteCodeInstruction::Jump(0)); 
    
    // Patch the jump_if_false instruction to jump to the false branch
    let false_branch_pos = bytecode.len();
    if let ByteCodeInstruction::Jump(ref mut target) = bytecode[jump_if_false_pos] {
        *target = false_branch_pos;
    }

    // Compile the false branch
    compile_byte_code_expression(&if_expr.r#false, bytecode);

    // Patch the jump instruction to jump past the false branch
    let end_pos = bytecode.len();
    if let ByteCodeInstruction::Jump(ref mut target) = bytecode[jump_over_false_pos] {
        *target = end_pos;
    }
}
```

Each type of expression, e.g. let-expressions, has a corresponding function that compiles it into bytecode following a similar structure.

I'm not too familiar with other bytecode compilers so the instruction set my compiler uses is not based on any previous designs. I just added the instructions I needed in order to run my small Lisp programs.

## Performance

By virtue of being small (i.e. not supporting many features) my VM is quite fast considering the amount effort I've invested (3-4 hours).

_Update: `@jpyo20` on X pointed out that I'm measuring the startup performance of Node.js rather than the computation. I (incorrectly) assumed that Node.js's startup time was single digit milliseconds and didn't matter._

~~While my Lisp variant is extremely constrained by the programs that can be expressed, it beats Node.js v20 when calculating the 25th Fibonacci number with recursive calls; ~250ms vs. ~300ms.~~

~~The reason my VM is faster likely comes down to the simplicity of the language and execution model. In contrast, Node.js has to support complex features like dynamic typing, object manipulation, and garbage collection, which introduce overhead in both time and memory. My Lisp variant avoids this complexity with a straightforward memory model, where variables are local to the expressions they're defined in and are discarded with the stack frame upon expression completion.~~

~~Since my VM uses a simpler memory model with a deterministic lifetime for variables (i.e., they live only as long as the expression), the overhead of garbage collection is very low. In contrast, Node.js's runtime spends additional cycles managing memory with more complex garbage collection.~~

In my VM, stack frames are managed with Rust's `Rc` (reference-counted pointers), which ensures that memory for closures and their variables is shared efficiently between stack frames. When an expression completes, its stack frame is discarded, and Rust's reference counting automatically cleans up the memory:

```rust
ByteCodeInstruction::CallLambda(n) => {
    match stack.pop() {
        Some(value) => match value {
            StackValue::Closure(params, closure_byte_code) => {
                let child_frame = StackFrame::child(Rc::clone(&frame));

                // Retrieve the arguments from the stack
                let args = stack.split_off(stack.len() - n);
                for (param, arg) in params.iter().zip(args) {
                    child_frame.borrow_mut().store(param.clone(), arg);
                }

                byte_code_vm(closure_byte_code, stack, Rc::clone(&child_frame))?;
                // The child frame's memory can be dropped here
            }
            StackValue::BuiltinFunction(func) => {
                let args = stack.split_off(stack.len() - n);
                func(args)?;
            }
            _ => {
                return Err(RuntimeError::new(
                    "cannot call non-closure or non-function",
                ))
            }
        },
        None => unreachable!(),
    }
}
```

I think it's possible to encode more precise ownership semantics using Rust's lifetime system but I went with reference counting (`Rc`) so that I could ship!

I haven't profiled my VM or made any performance improvements after I got it running but I have two ideas top of mind:

- One idea is to compact the stack layout to minimize cache misses. Currently, pushing entire closures and their bytecode onto the stack may introduce inefficiencies in memory access. A better approach might be to store only references to the closure's bytecode on the stack or use a register-based architecture to keep frequently accessed values in fast, CPU-level storage.
- In practice, most function calls will have a small number of arguments, making Rust's general-purpose `HashMap` an over-engineered solution. Using specialized data structures like `arrayvec` or `smallvec` would allow me to store small numbers of arguments inline, significantly improving lookup speed and reducing memory overhead.

The source code can be found [on GitHub](https://github.com/healeycodes/lisp-to-js). I have also come to realize that the repository is now misnamed as it does more than compile to JavaScript but alas!

If you're looking for more resources on bytecode VMs, check out the [second half of Crafting Interpreters](https://craftinginterpreters.com/contents.html#a-bytecode-virtual-machine) which walks you through implementing one in C.
