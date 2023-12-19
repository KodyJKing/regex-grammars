TypeScript style guide for copilot.

- Omit semicolons when possible.
    ```ts
    // Bad
    const foo = 1;
    // Good
    const foo = 1
    ```
- Omit the braces for single-line control statements (if, while, for, etc.).
    ```ts
    // Bad
    if (foo) {
        bar()
    }
    // Good
    if (foo) 
        bar()
    ```
- Prefer arrow functions over function expressions except at the top level of a module.
- Prefer const over let.
- Prefer template strings over string concatenation.
- Prefer the spread operator (...) over Object.assign() where possible.
- Prefer the rest operator (...) over arguments where possible.
- Prefer imaginary helper functions over complex inline logic. These can be implemented later.
- For calls with many arguments (> 2) put each argument on a separate line, align the arguments and include the name in a block comment.
    ```ts
    function foo( alpha: number, beta: number, gamma: number ) { ... }
    // Bad
    foo(1, 2, 3)
    // Good
    foo(
        /* alpha */ 1,
        /* beta  */ 2,
        /* gamma */ 3
    )
    ```
