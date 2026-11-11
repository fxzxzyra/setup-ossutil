import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { distribution, resolveVersion } from '../src/main.ts';

const execute = promisify(execFile);

test('official distribution URLs match the supported runner platforms', () => {
  for (const [platform, architecture, target] of [
    ['linux', 'x64', 'linux-amd64'],
    ['linux', 'arm64', 'linux-arm64'],
    ['darwin', 'x64', 'mac-amd64'],
    ['darwin', 'arm64', 'mac-arm64'],
    ['win32', 'x64', 'windows-amd64'],
  ]) {
    const release = distribution('2.4.1', platform, architecture);
    assert.equal(
      release.url,
      `https://gosspublic.alicdn.com/ossutil/v2/2.4.1/ossutil-2.4.1-${target}.zip`,
    );
    assert.equal(release.executable, platform === 'win32' ? 'ossutil.exe' : 'ossutil');
  }
});

test('the installer requires an exact 2.x release and a published platform', () => {
  assert.throws(() => distribution('1.7.19', 'linux', 'x64'), /exact ossutil 2.x/);
  assert.throws(() => distribution('2.x', 'linux', 'x64'), /exact ossutil 2.x/);
  assert.throws(() => distribution('2.4.1', 'win32', 'arm64'), /No ossutil distribution/);
});

test('latest is resolved from the official 2.x metadata on every call; exact versions skip lookup', async () => {
  let version = '2.4.1';
  const request = mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://gosspublic.alicdn.com/ossutil/v2/version.txt');
    assert.equal(options.cache, 'no-store');
    return new Response(`ossutil version: ${version}\n`);
  });
  try {
    assert.equal(await resolveVersion('2.4.1'), '2.4.1');
    assert.equal(request.mock.callCount(), 0);
    assert.equal(await resolveVersion('latest'), '2.4.1');
    version = '2.4.2';
    assert.equal(await resolveVersion('latest'), '2.4.2');
    assert.equal(request.mock.callCount(), 2);
  } finally {
    request.mock.restore();
  }
});

test(
  'bundled Action returns masked authentication only as a JSON output without credential files or job-wide exports',
  { skip: process.platform === 'win32' && !process.env.OSSUTIL_EXECUTABLE },
  async () => {
    const directory = await mkdtemp(join(tmpdir(), 'setup-ossutil-test-'));
    const cached = join(directory, 'tools/ossutil/2.4.1', process.arch);
    const executable = join(cached, process.platform === 'win32' ? 'ossutil.exe' : 'ossutil');
    try {
      await mkdir(cached, { recursive: true });
      if (process.env.OSSUTIL_EXECUTABLE) {
        await copyFile(process.env.OSSUTIL_EXECUTABLE, executable);
      } else {
        await writeFile(executable, '#!/bin/sh\nprintf "2.4.1\\n"\n', { mode: 0o644 });
      }
      await writeFile(`${cached}.complete`, '');
      for (const file of ['path', 'env', 'output', 'state'])
        await writeFile(join(directory, file), '');
      const { stdout } = await execute(
        process.execPath,
        [resolve(import.meta.dirname, '../dist/index.js')],
        {
          env: {
            ...process.env,
            RUNNER_TEMP: directory,
            RUNNER_TOOL_CACHE: join(directory, 'tools'),
            GITHUB_PATH: join(directory, 'path'),
            GITHUB_ENV: join(directory, 'env'),
            GITHUB_OUTPUT: join(directory, 'output'),
            GITHUB_STATE: join(directory, 'state'),
            INPUT_VERSION: '2.4.1',
            'INPUT_ACCESS-KEY-ID': 'test-access-id',
            'INPUT_ACCESS-KEY-SECRET': 'test-access-secret',
            INPUT_REGION: 'cn-shenzhen',
            INPUT_BUCKET: 'integration-test-bucket',
            INPUT_ENDPOINT: 'https://oss-cn-shenzhen.aliyuncs.com',
          },
        },
      );
      assert.doesNotMatch(stdout, /Installing ossutil/);
      assert.match(stdout, /::add-mask::test-access-id/);
      assert.match(stdout, /::add-mask::test-access-secret/);
      assert.match(stdout, /::add-mask::integration-test-bucket/);
      assert(stdout.includes('::add-mask::cn-shenzhen'));
      assert(stdout.includes('::add-mask::https://oss-cn-shenzhen.aliyuncs.com'));
      if (process.platform !== 'win32') {
        assert.equal((await stat(executable)).mode & 0o111, 0o111);
      }
      assert.equal((await readFile(join(directory, 'path'), 'utf8')).trim(), cached);
      assert.equal(await readFile(join(directory, 'env'), 'utf8'), '');
      assert.equal(await readFile(join(directory, 'state'), 'utf8'), '');
      assert.deepEqual((await readdir(directory)).sort(), [
        'env',
        'output',
        'path',
        'state',
        'tools',
      ]);
      const outputs = await readFile(join(directory, 'output'), 'utf8');
      const environment = JSON.parse(outputs.match(/(?:^|\n)env<<[^\n]+\n([^\r\n]+)/)[1]);
      assert.deepEqual(environment, {
        OSS_ACCESS_KEY_ID: 'test-access-id',
        OSS_ACCESS_KEY_SECRET: 'test-access-secret',
        OSS_REGION: 'cn-shenzhen',
        OSS_BUCKET: 'integration-test-bucket',
        OSS_ENDPOINT: 'https://oss-cn-shenzhen.aliyuncs.com',
      });
      assert.match(outputs, /2.4.1/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);
