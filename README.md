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

### Configure authentication

```yaml
- uses: fxzxzyra/setup-ossutil@v1
  with:
    access-key-id: ${{ secrets.OSS_ACCESS_KEY_ID }}
    access-key-secret: ${{ secrets.OSS_ACCESS_KEY_SECRET }}
    region: ${{ secrets.OSS_REGION }}
    endpoint: ${{ secrets.OSS_ENDPOINT }}

- run: ossutil ls oss://example-bucket/
```

Authentication inputs are optional for installation. To access OSS with an AccessKey pair, provide the ID, secret, and region. `endpoint` is optional; omitting it lets ossutil select the regional endpoint.

Provided values, including `region` and `endpoint`, are registered with the runner's secret masker and written to a dedicated configuration file under the runner's temporary directory. On Linux and macOS, the directory is owner-only (`0700`) and the file is owner-readable and writable (`0600`). Only the file path is exported through `OSSUTIL_CONFIG_FILE`; authentication values are not exported as environment variables or returned as outputs.

The action removes its temporary configuration during post-job cleanup, including after failed jobs. Existing ossutil configuration files are left untouched. If no authentication inputs are supplied, no configuration is created. Existing command-line options and OSS environment variables retain ossutil's native precedence over the generated configuration. Steps running as the same user can still read the temporary file; this is not a security boundary between steps.

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
| `access-key-id`     | AccessKey ID for the temporary configuration.        | Unset    |
| `access-key-secret` | AccessKey secret for the temporary configuration.    | Unset    |
| `region`            | OSS region, such as `cn-shenzhen`.                   | Unset    |
| `endpoint`          | Optional custom OSS endpoint.                        | Unset    |

## Outputs

| Name      | Description                                           |
| --------- | ----------------------------------------------------- |
| `version` | Resolved ossutil version, such as `2.4.1`.            |
| `path`    | Cached directory containing the `ossutil` executable. |

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
