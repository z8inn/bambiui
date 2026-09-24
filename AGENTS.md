<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Base UI

- Read `docs/base-ui.md` before implementing or modifying Base UI components.
- Treat that project-local reference and its linked official documentation as authoritative over prior knowledge.
- Use only the current `@base-ui/react` package name and documented subpath imports.

## Commit conventions

- All commit messages must follow the Conventional Commits format enforced by commitlint: `<type>(<optional-scope>): <description>`.
- Use an appropriate lowercase type such as `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`, `build`, `ci`, or `revert`.
- Keep the description concise, imperative, and lowercase, without a trailing period.
- Use `!` or a `BREAKING CHANGE:` footer for breaking changes.
- Examples: `feat: add button component`, `fix(theme): correct dark mode colors`, `chore: update dependencies`.
