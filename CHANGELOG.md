# Changelog

## 1.3.0 — 2026-11-11

- Add an optional `bucket` input, included as `OSS_BUCKET` in the JSON `env` output.
- Mask the supplied bucket name and keep it scoped to steps that consume the output.

## 1.2.0 — 2026-11-11

- Return authentication as a masked JSON `env` output for explicit step-level injection with `fromJSON`.
- Remove credential configuration files, job-wide authentication exports, and post-job cleanup.
- Workflows supplying authentication inputs must now apply the `env` output to steps that need OSS access.

## 1.1.0 — 2026-11-11

- Store authentication inputs in a private temporary ossutil configuration instead of exporting credentials to subsequent steps.
- Export only the configuration path and remove the file during post-job cleanup.
- Preserve existing ossutil configuration files and leave authentication unchanged when no inputs are provided.

## 1.0.1 — 2026-11-11

- Extract official ZIP distributions within Node.js without requiring system archive tools.
- Verify installation and cache reuse with an isolated PATH on Linux, macOS, and Windows.

## 1.0.0 — 2026-11-11

- Install official ossutil 2.x distributions on Linux, macOS, and Windows.
- Resolve the latest stable 2.x version on every invocation, with exact-version pinning available.
- Reuse the Actions runner tool cache by version and architecture.
- Configure optional AccessKey authentication, region, and endpoint through masked inputs.
- Provide Node.js 24 ESM execution and a committed distribution.
