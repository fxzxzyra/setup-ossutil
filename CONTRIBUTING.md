# Contributing

Use Node.js 24 and npm. Install the locked dependencies before making changes:

```sh
npm ci
```

## Validation

```sh
npm run format
npm run lint
npm run check
npm run build
npm test
```

`npm run build` generates the ESM entrypoint and bundled dependency licenses in `dist/`. Include these generated files with source changes. CI rebuilds them and fails when the committed distribution differs.

The test suite covers version resolution, supported distribution URLs, cache reuse, PATH registration, authentication export, and secret masking. When a real ossutil executable is available, it also tests pagination, authentication, full object replacement, and prefix-scoped deletion against a local in-memory OSS service. No real OSS account is required.

To enable the OSS integration tests:

```sh
OSSUTIL_EXECUTABLE=/absolute/path/to/ossutil npm test
```

To test the complete installation path, including an official download and a second invocation that uses the cache:

```sh
npm run test:install
```

This check requires network access and `unzip` on Linux or macOS. CI also installs the action itself on Linux, macOS, and Windows and runs tests against the installed executable.

## Releases

1. Update the package version and lockfile with `npm version --no-git-tag-version`.
2. Add the release notes to `CHANGELOG.md`.
3. Run validation and commit the source, lockfile, and generated distribution together.
4. After CI passes, create the immutable semantic version tag, such as `v1.0.0`.
5. Update the corresponding major version tag, such as `v1`, to the same commit.

Changes to the default ossutil version policy, input names, output formats, or supported platforms must be documented in the changelog. Keep authentication inputs out of diagnostic messages and test fixtures containing real credentials out of the repository.
