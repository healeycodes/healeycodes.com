---
title: "Porting Boolrule To Rust"
date: "2023-08-18"
tags: ["rust"]
description: "Building a fast boolean expression evaluation engine."
---

I recently ported a boolean expression engine called [boolrule](https://github.com/tailsdotcom/boolrule) from Python to Rust. My version is called coolrule and it's [open source](https://github.com/healeycodes/coolrule), published on [crates](https://crates.io/crates/coolrule), and passes the boolrule test suite.

```rust
// Without context
let expr = coolrule::new("1 in (1, 2, 3)")?;
let test = expr.test()?; // true 

// With context
let expr = coolrule::new("x == 8")?;
let test = expr.test_with_context(
    HashMap::from([(vec!["x"], Value::Number(8.0))])
)?; // true
```

Building this port was harder than I predicted. I had to learn a parsing library, work out how the lesser-used operators of boolrule work, and look into how Python evaluates tuple comparisons. For example, `assert (1, print) < (2, None)` is valid, non-erroring, Python code. The tuples stop being compared after the first index – it's `True`.

Boolrule has a small grammar ([45 LoC](https://github.com/tailsdotcom/boolrule/blob/a1671fc372039cfcf4d09673e575ffe69c1a4679/boolrule/boolrule.py#L59-L112)), powered by [pyparsing](https://github.com/pyparsing/pyparsing), and the evaluation logic is [terse and elegant](https://github.com/tailsdotcom/boolrule/blob/a1671fc372039cfcf4d09673e575ffe69c1a4679/boolrule/boolrule.py#L200-L231). This elegance is lost in my translation but the performance of a compiled language like Rust means it's automatically 3x faster (in my quick benchmarks) without any optimization work – as well as the usual benefits of static types.

During this project, I learned that I prefer working on parsing/evaluation code in Rust – compared to my experience working on intepreters written in Python + Mypy. In coolrule, when I had to refactor something early in the code flow, like a section of the grammar, adjusting for the downstream effects meant following the rust-analyzer warnings and making obvious fixes.

## Parsing a Boolean Expression

Boolean expressions in boolrule look like this:

```text
true == false
foo.bar isnot none
x in (5, 6, 7)
(1, 2, 3) ⊆ (1, 2, 3) and 1 > 2
```

At a high-level, there are _values_ and _binary operators_ which are joined together by and/or. Parentheses are used to define groups rather than to define sub-expressions.

Most of the real-world use-cases of boolrule I've seen involve things like checking if a customer's attributes are in a certain group. This is where the library shines — the flexibility of using a dynamic string as evaluation logic.

So perhaps a more practical example is like `customer.plan in ("pro", "enterprise")`. Which is parsed into a structure that kinda looks like this:

```text
              in
             /   \
customer.plan    group
                 /   \
             "pro"  "enterprise"
```

The Rust parsing library I used is called [pom](https://github.com/J-F-Liu/pom) (PEG parser combinators using operator overloading without macros). I tried a few parsing libraries and ended up preferring the ones where you wrote code instead of maintaining a separate grammar file. The parser-combinator style of pom helped me stay in more of a flow state. Having rust-analyzer hold my hand as I fumbled around with combinators was a life saver. I also found the pom examples to be hackable and I even lifted parts of the [JSON parser example](https://github.com/J-F-Liu/pom/blob/master/examples/json.rs) to handle parsing strings and floats in coolrule.

Here's a simplified excerpt to show you what all that looks like:

```rust
// parser.rs

pub fn parse<'a>(input: &str) -> Result<BooleanExpression, pom::Error> {
    (space() * boolean_expression() - end()).parse(input.as_bytes())
}

fn boolean_expression<'a>() -> Parser<'a, u8, BooleanExpression> {
    boolean_condition().map(|boolean_condition| BooleanExpression {
        initial: boolean_condition,
        conditions: vec![],
    })
}

fn boolean_condition<'a>() -> Parser<'a, u8, BooleanCondition> {
    (property_val() + binary_op() + property_val())
        .map(|((lval, bin_op), rval)|
            BooleanCondition::Comparison(lval, bin_op, rval))
}

// ...

fn integer<'a>() -> Parser<'a, u8, u8> {
    one_of(b"123456789") -
        one_of(b"0123456789")
        .repeat(0..) | sym(b'0')
}
```

The parse tree is made up of recursive structs and enums, the nodes of the tree are built from parsing functions that return these types.

```rust
// parser.rs

pub enum BooleanCondition {
    Comparison(PropertyVal, BinOp, PropertyVal),
    Group(Box<BooleanExpression>),
}

pub struct BooleanExpression {
    pub initial: BooleanCondition,
    pub conditions: Vec<(AndOr, BooleanCondition)>,
}
```

Most of the parse trees I've worked with before are deep but in boolrule they are much more wide. The initial boolean condition (a binary operator with two children, a value or a group) is followed by any number of <and/or, boolean condition> blocks, depending on the length of the expression.

The core section of evaluation involves looping over these blocks.

```rust
// evaluator.rs

fn eval_boolean_expression(
    boolean_expression: &BooleanExpression,
    context: &HashMap<Vec<String>, SimpleValue>,
) -> Result<bool, EvalError> {
    let mut result = eval_boolean_condition(&boolean_expression.initial, context)?;
    for (and_or, cond) in boolean_expression.conditions.as_slice() {
        let next = eval_boolean_condition(&cond, context)?;
        match and_or {
            AndOr::And => {
                result = result && next;
            }
            AndOr::Or => {
                result = result || next;
            }
        }
    }
    return Ok(result);
}
```

I used the same internal naming conventions from the boolrule codebase so that the different sections of the parsing and evaluation logic were easier to follow as I ported them.

## Failing to Write a Python→Rust Plugin

After getting the boolrule test suite to pass, I looked into making this project a rewrite rather than a port so that it could be used as a Python library (that calls into Rust). A faster, drop-in replacement for boolrule. However, I should note that boolrule is not used in performance sensitive applications and that this idea was a bit of a self-nerd-snipe.

I wanted to use [PyO3](https://github.com/PyO3/pyo3) because of its pleasant API:

```rust
use pyo3::prelude::*;

/// Formats the sum of two numbers as string.
#[pyfunction]
fn sum_as_string(a: usize, b: usize) -> PyResult<String> {
    Ok((a + b).to_string())
}

/// A Python module implemented in Rust. The name of this function must match
/// the `lib.name` setting in the `Cargo.toml`, else Python will not be able to
/// import the module.
#[pymodule]
fn string_sum(_py: Python<'_>, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(sum_as_string, m)?)?;
    Ok(())
}
```

But when I started writing the PyO3 glue code, I bumped into all kinds of edge cases. While the boolrule grammar has a fixed set of types (str, int, float, bool, none), the objects that you can pass via context can be literally anything.

```python
import sys
import boolrule

# here's a valid boolrule evaluation..
b = boolrule.BoolRule("(a) == (a)").test({"a": sys})
```

Handling these arbitrary Python objects inside Rust was tricky. Especially when I had to translate them into some kind of “special value” that could be compared inside the evaluation step. I briefly entertained using the Python builtin [hash()](https://docs.python.org/3/library/functions.html#hash) to get a deterministic id for non-(str/int/float/bool/none) objects so they could be compared reliably.

But then I started to worry that my work would be fruitless and the overhead of this data mangling would remove much of the performance benefits (while edge cases still lurked).

So instead I just smashed that publish button.
