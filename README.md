# Setup ossutil

[![CI](https://github.com/fxzxzyra/setup-ossutil/actions/workflows/ci.yml/badge.svg)](https://github.com/fxzxzyra/setup-ossutil/actions/workflows/ci.yml)

Install [Alibaba Cloud ossutil 2.x](https://help.aliyun.com/en/oss/developer-reference/ossutil-overview/) in GitHub Actions.

This action downloads the official distribution, caches it in the runner tool cache, and adds `ossutil` to `PATH`. It runs on Node.js 24 and supports Linux, macOS, Windows, and Linux job containers.

## Usage

### Install the latest stable version

```yaml
steps:
  - uses: fxzxzyra/setup-ossutil@v1
  - run: ossutil version
```

The default `version: latest` queries Alibaba Cloud's [2.x version metadata](https://gosspublic.alicdn.com/ossutil/v2/version.txt) on every invocation. The action reuses a cached binary only when it matches the resolved version. It does not fall back to an older cached release if version lookup fails.

### Install a specific version

```yaml
- uses: fxzxzyra/setup-ossutil@v1
  with:
    version: '2.4.1'
```

An exact `2.x.y` version skips latest-version lookup. Version ranges and ossutil 1.x are not supported.

### Configure step-scoped authentication

```yaml
- uses: fxzxzyra/setup-ossutil@v1
  id: ossutil
  with:
    access-key-id: ${{ secrets.OSS_ACCESS_KEY_ID }}
    access-key-secret: ${{ secrets.OSS_ACCESS_KEY_SECRET }}
    region: ${{ secrets.OSS_REGION }}
    endpoint: ${{ secrets.OSS_ENDPOINT }}
    bucket: ${{ secrets.OSS_BUCKET }}

- run: ossutil ls "oss://${OSS_BUCKET}/"
  env: ${{ fromJSON(steps.ossutil.outputs.env) }}
```

Authentication inputs are optional for installation. To access OSS with an AccessKey pair, provide the ID, secret, and region. `endpoint` is optional; omitting it lets ossutil select the regional endpoint.

The action returns supplied authentication values and the optional bucket name as a JSON object in its `env` output. Apply it to each step that needs OSS access with `env: ${{ fromJSON(steps.ossutil.outputs.env) }}`. The object contains `OSS_ACCESS_KEY_ID`, `OSS_ACCESS_KEY_SECRET`, `OSS_REGION`, `OSS_ENDPOINT`, and `OSS_BUCKET` only when the corresponding inputs are provided; without inputs it is `{}`.

`bucket` is a convenience input for scripts; ossutil does not select a bucket from `OSS_BUCKET` automatically. Reference `${OSS_BUCKET}` in object URLs as shown above.

All supplied values are registered with the runner's secret masker. The action does not write credentials to a configuration file or export authentication variables through `GITHUB_ENV`. Only steps that explicitly consume the output receive the variables. Use the output within the same job; do not print it or forward it as a job output. Secret-containing job outputs may be suppressed by GitHub Actions. Step-scoped environment variables limit propagation but do not isolate steps running as the same user.

### Linux job containers

The action installs into the runner tool cache and extracts ZIP archives in Node.js. No system archive tools or `sudo` are required:

```yaml
jobs:
  publish:
    runs-on: ubuntu-latest
    container: fedora:45
    steps:
      - uses: fxzxzyra/setup-ossutil@v1
      - run: ossutil version
```

## Inputs

| Name                | Description                                          | Default  |
| ------------------- | ---------------------------------------------------- | -------- |
| `version`           | `latest` or an exact stable ossutil `2.x.y` version. | `latest` |
| `access-key-id`     | AccessKey ID included in the `env` output.           | Unset    |
| `access-key-secret` | AccessKey secret included in the `env` output.       | Unset    |
| `region`            | OSS region, such as `cn-shenzhen`.                   | Unset    |
| `bucket`            | Optional bucket name included as `OSS_BUCKET`.       | Unset    |
| `endpoint`          | Optional custom OSS endpoint.                        | Unset    |

## Outputs

| Name      | Description                                                      |
| --------- | ---------------------------------------------------------------- |
| `version` | Resolved ossutil version, such as `2.4.1`.                       |
| `path`    | Cached directory containing the `ossutil` executable.            |
| `env`     | JSON object of supplied OSS authentication variables and bucket. |

## Supported platforms

The action selects the distribution matching the platform and architecture of its Node.js runtime.

| Platform | Architectures |
| -------- | ------------- |
| Linux    | x64, ARM64    |
| macOS    | x64, ARM64    |
| Windows  | x64           |

JavaScript actions require a runner that supports Node.js 24. GitHub-hosted runners meet this requirement; self-hosted runners require [Actions Runner v2.327.1 or later](https://github.com/actions/runner/releases/tag/v2.327.1).

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for build, test, and release instructions.

The project follows the structure of GitHub's [TypeScript action template](https://github.com/actions/typescript-action) and uses the [Actions Toolkit](https://github.com/actions/toolkit). The bundled entrypoint is committed to `dist/`, so consumer workflows do not run npm or compile TypeScript.

## License

[MIT](LICENSE). Licenses for dependencies included in the bundle are generated in [dist/licenses.txt](dist/licenses.txt).
