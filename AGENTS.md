# Ultracite Code Standards

This project enforces strict code quality standards through automated formatting and linting. **Vite+** (`vp`) is the toolchain: it runs Oxlint and Oxfmt from the `lint` and `fmt` blocks in `vite.config.ts`, and runs workspace tasks in place of Turborepo. Ultracite supplies the rule presets those blocks extend, but is no longer the CLI.

## Quick Reference

- **Format code**: `vp fmt`
- **Check for issues**: `vp check`
- **Fix what is fixable**: `vp check --fix`
- **Show the toolchain**: `vp toolchain`
- **Run a workspace task**: `vp run -r <task>` (add `--no-cache` to force a real run)

Most issues are automatically fixable. See `docs/internals/linting.md` for which rules are off and why.

## Documentation

`docs/` is markdown only. `docs/internals/` keeps decisions, constraints and traps the source does not explain; `docs/operations/` keeps runbooks. Most changes need neither. Design mocks, screenshots and implementation plans are review material: share them in the PR or a rendered preview, never commit them. List a new doc in `docs/README.md`.

Comments say why: a constraint, a platform or library quirk, a race, or an invariant another file relies on. One line, three at most, no em dashes. Don't restate names, narrate steps, or record history; reasoning about how the code got here goes in the commit message. `outlayr/no-low-value-comments` and `outlayr/no-slop-comments` enforce the mechanical part.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**

- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**

- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

Only write a test if it would actually fail when the code is broken in a way that matters. Everything else is slop.

Before writing one, name the bug it catches. If you cannot, skip it. Slop looks like:

- Restating the source: a constant, config value, cron schedule, or copy string asserted equal to what the code already says
- Testing React, Intl, zod, Convex, or anything TypeScript already enforces
- Pinning implementation details (internal component types, modifier arrays, mock call counts) instead of what a user or caller sees
- Smoke tests: renders without crashing, `toBeDefined()`, `toBeTruthy()` and nothing else
- Regression tests for removed features ("no longer shows X")
- Duplicates: another test walking the same branch with different numbers
- Mocks doing the work, so the assertion only checks the mock

What earns a test: money math, dates and time zones, sync and conflict resolution, parsers and imports, auth, data deletion, and bugs that actually shipped.

No render tests for components, screens, navigation, widgets, hooks or contexts in `apps/native`. Move the logic into a pure function and test that, and check the UI on the simulator. The only `.test.tsx` files left are `renderHook` tests under `lib`, `data`, `i18n` and `theme` that guard auth, sync or data reset.

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- No per-test timeout or retry: the runner's default is the ceiling, so await what the test is waiting for. `outlayr/no-test-timeout-or-retry` enforces it; only `*.live.test.ts` model probes are exempt
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Oxlint + Oxfmt Can't Help

Oxlint + Oxfmt's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Oxlint + Oxfmt can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Prefer self-documenting code; comment only the why (see Documentation above)

---

Most formatting and common issues are automatically fixed by Oxlint + Oxfmt. Run `vp check --fix` before committing to ensure compliance; the pre-commit hook runs `vp staged` over staged files anyway.
