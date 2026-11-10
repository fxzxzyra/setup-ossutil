import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const execute = promisify(execFile);
const directory = await mkdtemp(join(tmpdir(), 'setup-ossutil-install-'));
try {
  for (const file of ['path', 'env', 'output']) await writeFile(join(directory, file), '');
  const env = {
    ...process.env,
    RUNNER_TEMP: directory,
    RUNNER_TOOL_CACHE: join(directory, 'tools'),
    GITHUB_PATH: join(directory, 'path'),
    GITHUB_ENV: join(directory, 'env'),
    GITHUB_OUTPUT: join(directory, 'output'),
    INPUT_VERSION: 'latest',
  };
  const first = await execute(
    process.execPath,
    [resolve(import.meta.dirname, '../dist/index.js')],
    { env },
  );
  const version = (await readFile(env.GITHUB_OUTPUT, 'utf8')).match(
    /version<<[^\n]+\n(2\.\d+\.\d+)/,
  )[1];
  assert(first.stdout.includes(`Installing ossutil ${version}`));
  const installed = (await readFile(env.GITHUB_PATH, 'utf8')).trim();
  assert.equal(
    (
      await execute(join(installed, process.platform === 'win32' ? 'ossutil.exe' : 'ossutil'), [
        'version',
      ])
    ).stdout.trim(),
    version,
  );
  const second = await execute(
    process.execPath,
    [resolve(import.meta.dirname, '../dist/index.js')],
    { env },
  );
  assert.doesNotMatch(second.stdout, /Installing ossutil/);
  console.log(
    `Official latest ossutil ${version} lookup, download, extraction, execution and cache reuse passed`,
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
