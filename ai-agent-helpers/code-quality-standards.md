# 1. Code Quality Standards

## A. TypeScript

- Avoid `interface` keyword and prefer using `type` for types
- Prefer async/await syntax over .then()/.catch()
- Prefer using the `function` keyword to define functions rather than using arrow functions or `const` function expressions.
- Prefer typescript over javascript.
- Prefer `Array.forEach` over `for of`.
- Prefer optional chaining (e.g., `registration?.sync`) over using logical AND (`registration && registration.sync`) inside conditional statements.
- A function's signature should always be 1 parameter called `props`. Avoid using func(a,b,c), and prefer using func(props), where `props` is `{a,b,c}`.
- Always destruct the `props` argument of a function inside the function's body, never in the function's signature.
- Avoid returning the output of a function directly as the input to another function. Always store the output in a variable first before passing it to another function.
- Never return a promise. Always store the awaited result in a variable and then return that variable.

## B. Testing Best Practices

- **Always write unit tests for new code**. Use the existing test files as a reference.
- **After updating any logic**, check whether existing unit tests need to be updated. If so, update them accordingly.
- **Tests should be placed in the same directory as the code they test**, following the naming convention `*.test.ts` or `*.spec.ts`.
- **When writing unit tests where the expected result is an object**, follow the pattern of creating 2 variables: `expectedResult` and `actualResult`. Always use `expect(actualResult).toEqual(expectedResult);` for these assertions.
- Follow the Arrange-Act-Assert pattern
- One logical assertion per test
- Keep tests independent and isolated
- Add proper wait strategies (avoid hard-coded delays)

## C. Code Formatting

- Run `pnpm run format:biome:fix` to fix formatting issues
- Run `pnpm run lint:fix` to fix linting issues
- Run `pnpm run build` to verify the build process works

## D. Imports

- Generally, use relative imports.
- Absolute imports are supported by prefixing with `@src/`.
- Use absolute imports when importing from one of the following: `src/common` | `src/lib`.
- **Use clear consistent imports** (prefer relative imports and avoid circular dependencies).

## E. Re-use logic

- Alway look for existing utility functions inside `src/common/utils` before creating them from scratch.
