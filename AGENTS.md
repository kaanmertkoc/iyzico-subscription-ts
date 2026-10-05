# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project Overview

`@kaanmertkoc/iyzico-subs-ts` is an open-source, runtime-agnostic TypeScript SDK for the
[Iyzico](https://www.iyzico.com) v2 Subscription API. It is published to npm and runs on
Node.js (>=18), Bun, Deno, browsers, and edge/worker runtimes.

- **SDK (repo root)**: `src/` is the published library, `tests/` holds its test suite.
- **`examples/hono-app`**: Hono + Zod REST API that consumes the SDK via `file:../..`.
- **`examples/nextjs-saas`**: README-only placeholder for a Next.js example.
- **`openapi/`**: OpenAPI spec plus a static docs site (`openapi/docs/`) with its own Dockerfile.

## Commands

Bun is the package manager and script runner. Tests use **Vitest**, so run them with
`bun run test`, not `bun test` (that starts Bun's own test runner).

The repo uses **TypeScript 7** (the native Go compiler, pinned to an exact version). TS 7
removed `moduleResolution: "node"`, so the tsconfigs use `bundler`; don't reintroduce `node`/`node10`.

```bash
bun install               # install root + example workspaces
bun run typecheck         # tsc --noEmit over src/
bun run test              # vitest (watch mode in a TTY; add `--run` for one pass)
bun run test:coverage     # vitest with v8 coverage (80% thresholds)
bun run build             # clean, then ESM + CJS + .d.ts builds into dist/
bun run size              # pack the package and report zipped/unzipped size
bun run size:track        # same, and record the result in .package-size-history.json
bun dev                   # run examples/hono-app with hot reload (needs .env.local)
bun run --cwd examples/hono-app typecheck   # typecheck the Hono example (build the SDK first)
bun run docs:sync         # copy openapi/openapi.yaml into openapi/docs/
bun run docs:serve        # serve the docs site locally
```

Before finishing a change to `src/`, run `bun run typecheck` and `bun run test --run`.

## Architecture

```
src/
├── index.ts          # public entry point: re-exports client, errors, services, types, generateAuthHeaders
├── client.ts         # IyzicoClient: config validation, sandbox resolution, request(), retries, timeouts
├── auth.ts           # AuthManager: IYZWSv2 HMAC-SHA256 signature headers (node:crypto)
├── error.ts          # IyzicoError hierarchy, IyzicoClientOptions, error-code messages, ErrorCategory
├── services/         # one class per API domain, each wraps client.request()
│   ├── products.ts  plans.ts  checkout.ts  subscriptions.ts  customers.ts  health.ts
└── types/            # request/response types per domain, re-exported from types/index.ts
```

- **`IyzicoClient`** builds every service in its constructor (`client.products`, `client.plans`,
  `client.checkout`, `client.subscriptions`, `client.customers`, `client.health`). Services hold
  a reference to the client and call `client.request<T>({ path, method, body })`.
- **`request()`** signs the request (the HMAC covers the path **without** the query string),
  calls global `fetch` with an `AbortController` timeout, parses JSON (or wraps non-JSON as
  `{ rawResponse }`), and retries 5xx/408/429 with exponential backoff (capped at 10s,
  `maxRetries` default 3).
- **Errors**: all SDK errors extend the abstract `IyzicoError`:
  `IyzicoApiError` (non-2xx), `IyzicoNetworkError` (timeouts, fetch failures, unknown errors),
  `IyzicoConfigError` (bad options), `IyzicoSandboxLimitationError` (subscription routes hit in sandbox).
- **Sandbox**: `isSandbox: true` or env `IYZICO_ENVIRONMENT=sandbox` switches to
  `https://sandbox-api.iyzipay.com` and requires `sandboxApiKey`/`sandboxSecretKey`.
  Iyzico's sandbox does not serve `/v2/subscription/*`; only health/BIN-check endpoints work there.
- **Auth testability**: `AuthManager` accepts `timestampProvider` and `randomProvider` via
  `authConfig` so tests can produce deterministic signatures.

## Conventions and Constraints

- **Zero runtime dependencies.** The package's main selling point is a small, dependency-free
  install. Do not add entries to `dependencies` without the maintainer's explicit approval.
- **Runtime agnostic.** Use only universal APIs (`fetch`, `AbortController`, `URL`) plus
  `node:crypto`. No Bun-, Deno- or Node-only APIs in `src/` beyond `node:crypto`. Guard any
  `process` access with `typeof process !== 'undefined'`.
- **Strict TypeScript**: `strict`, `exactOptionalPropertyTypes`, `noUnusedLocals/Parameters`,
  `noImplicitReturns`. With `exactOptionalPropertyTypes`, spread optional values conditionally
  (`...(x !== undefined ? { x } : {})`) instead of assigning `undefined`.
- **Public API**: anything new that users should import must be exported from `src/index.ts`
  (and types from `src/types/index.ts`). The package also exposes a `./types` subpath export;
  `tests/exports.test.ts` checks the `package.json` exports map.
- **Style**: single quotes, semicolons, 2-space indent, JSDoc on public service methods.
  Debug logging is gated on `options.debug` and marked `/* c8 ignore next N */`.
- **Build output**: three tsconfigs (`tsconfig.esm.json`, `tsconfig.cjs.json`,
  `tsconfig.types.json`) emit `dist/esm`, `dist/cjs`, `dist/types`. Only `dist/`, `README.md`
  and `LICENSE` are published (`files` in `package.json`).

## Adding an Endpoint

1. Add request/response types in the matching `src/types/<domain>.ts` and re-export them from
   `src/types/index.ts`.
2. Add a method to the matching `src/services/<domain>.ts` that calls `this.client.request<T>()`.
   Follow existing services for default `conversationId`/`locale` values in the body.
3. For a new domain, create the service class, instantiate it in the `IyzicoClient` constructor,
   and export it from `src/index.ts`.
4. Add tests in `tests/<domain>.test.ts`, and update `openapi/openapi.yaml` (then `bun run docs:sync`)
   and the README if the public API changed.

## Testing

- Vitest, `node` environment, files in `tests/**/*.test.ts`.
- Tests mock global `fetch` with `vi.fn()`. Never make live network calls.
- Cover the success path, the request shape (URL, method, body, auth headers) and error cases.
- Coverage excludes `src/types/**` and `index.ts` files; keep the 80% thresholds green.

## Releasing

`bun run release` publishes to npm (`prepublishOnly` builds first) and creates a GitHub release
for the current `package.json` version. Bump the version, then run `bun run size:track` so the
size history in `.package-size-history.json` / `PACKAGE_SIZE_TRACKING.md` stays current.
Don't publish or tag without being asked.

## Environment Variables

The SDK reads only `IYZICO_ENVIRONMENT` (`sandbox` forces sandbox mode). The Hono example
expects its credentials in `examples/hono-app/.env.local`; see `examples/hono-app/.env.example`.
Never commit real API keys.
