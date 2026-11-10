import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as cache from '@actions/tool-cache';
import AdmZip from 'adm-zip';
import { chmod, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function distribution(version: string, platform: string, architecture: string) {
  if (!/^2\.\d+\.\d+$/.test(version)) {
    throw new Error('version must be an exact ossutil 2.x version, such as 2.4.1');
  }
  const targets: Record<string, string> = {
    'linux-x64': 'linux-amd64',
    'linux-arm64': 'linux-arm64',
    'darwin-x64': 'mac-amd64',
    'darwin-arm64': 'mac-arm64',
    'win32-x64': 'windows-amd64',
  };
  const target = targets[`${platform}-${architecture}`];
  if (!target) throw new Error(`No ossutil distribution for ${platform}/${architecture}`);
  const name = `ossutil-${version}-${target}`;
  return {
    name,
    url: `https://gosspublic.alicdn.com/ossutil/v2/${version}/${name}.zip`,
    executable: platform === 'win32' ? 'ossutil.exe' : 'ossutil',
  };
}

export async function resolveVersion(version: string) {
  if (version !== 'latest') return version;
  const response = await fetch('https://gosspublic.alicdn.com/ossutil/v2/version.txt', {
    cache: 'no-store',
  });
  if (!response.ok)
    throw new Error(`Could not query latest ossutil version: HTTP ${response.status}`);
  const match = /^ossutil version:\s*(2\.\d+\.\d+)$/.exec((await response.text()).trim());
  if (!match)
    throw new Error('The official version file did not contain a stable ossutil 2.x version');
  return match[1];
}

export async function run() {
  const version = await resolveVersion(core.getInput('version', { required: true }));
  const release = distribution(version, process.platform, process.arch);
  let directory = cache.find('ossutil', version, process.arch);
  if (!directory) {
    core.info(`Installing ossutil ${version}`);
    const archive = await cache.downloadTool(release.url);
    const extracted = await mkdtemp(join(tmpdir(), 'setup-ossutil-'));
    await new AdmZip(archive).extractAllToAsync(extracted);
    directory = await cache.cacheDir(
      join(extracted, release.name),
      'ossutil',
      version,
      process.arch,
    );
  }
  const executable = join(directory, release.executable);
  if (process.platform !== 'win32') await chmod(executable, 0o755);
  core.addPath(directory);
  for (const [input, variable] of Object.entries({
    'access-key-id': 'OSS_ACCESS_KEY_ID',
    'access-key-secret': 'OSS_ACCESS_KEY_SECRET',
    region: 'OSS_REGION',
    endpoint: 'OSS_ENDPOINT',
  })) {
    const value = core.getInput(input);
    if (value) {
      core.setSecret(value);
      core.exportVariable(variable, value);
    }
  }
  await exec.exec(executable, ['version']);
  core.setOutput('version', version);
  core.setOutput('path', directory);
}
