import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const execute = promisify(execFile);
const binary = process.env.OSSUTIL_EXECUTABLE;
const prefix = 'fedora-45/repo/';
const md5 = (bytes) => createHash('md5').update(bytes).digest('hex');
const item = (key, bytes) =>
  `<Contents><Key>${key}</Key><LastModified>2026-11-10T00:00:00.000Z</LastModified><ETag>"${md5(bytes)}"</ETag><Size>${bytes.length}</Size><StorageClass>Standard</StorageClass></Contents>`;

async function service(handler, callback) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const env = {
    ...process.env,
    OSS_ENDPOINT: `http://127.0.0.1:${server.address().port}`,
    OSS_REGION: 'cn-shenzhen',
    OSS_ACCESS_KEY_ID: 'test-id',
    OSS_ACCESS_KEY_SECRET: 'test-secret',
  };
  try {
    await callback(env);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test(
  'ossutil 2.x lists all pages using the with-exported credential variables',
  { skip: !binary },
  async () => {
    const tokens = [];
    const authorization = [];
    await service(
      (request, response) => {
        const url = new URL(request.url, 'http://localhost');
        tokens.push(url.searchParams.get('continuation-token'));
        authorization.push(request.headers.authorization);
        response.setHeader('content-type', 'application/xml');
        const second = url.searchParams.has('continuation-token');
        response.end(
          `<ListBucketResult><Name>bucket</Name><Prefix>${prefix}</Prefix><MaxKeys>1000</MaxKeys><IsTruncated>${!second}</IsTruncated>${second ? '' : '<NextContinuationToken>page-two</NextContinuationToken>'}${item(prefix + (second ? 'x86_64/driver.x86_64.rpm' : 'noarch/doc.noarch.rpm'), Buffer.from('RPM'))}</ListBucketResult>`,
        );
      },
      async (env) => {
        const { stdout } = await execute(
          binary,
          ['ls', `oss://bucket/${prefix}`, '--short-format', '--addressing-style', 'path'],
          { env },
        );
        assert.match(stdout, /doc.noarch.rpm/);
        assert.match(stdout, /driver.x86_64.rpm/);
      },
    );
    assert.deepEqual(tokens, [null, 'page-two']);
    assert(
      authorization.every(
        (value) => value.includes('Credential=test-id/') && value.includes('/cn-shenzhen/oss/'),
      ),
    );
  },
);

test(
  'ossutil 2.x sync fully overwrites existing bytes and deletes orphan objects within the target prefix',
  { skip: !binary },
  async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ossutil-sync-test-'));
    const target = `${prefix}x86_64/driver.x86_64.rpm`;
    const orphan = `${prefix}x86_64/orphan.x86_64.rpm`;
    const foreign = 'fedora-44/repo/x86_64/foreign.x86_64.rpm';
    const objects = new Map([
      [target, Buffer.from('old signed bytes')],
      [orphan, Buffer.from('orphan')],
      [foreign, Buffer.from('keep')],
    ]);
    try {
      await mkdir(join(directory, 'x86_64'));
      await writeFile(join(directory, 'x86_64/driver.x86_64.rpm'), 'new signed bytes');
      await service(
        async (request, response) => {
          const url = new URL(request.url, 'http://localhost');
          const key = decodeURIComponent(url.pathname.replace(/^\/bucket\/?/, ''));
          response.setHeader('content-type', 'application/xml');
          if (request.method === 'GET') {
            response.end(
              `<ListBucketResult><Name>bucket</Name><Prefix>${prefix}</Prefix><IsTruncated>false</IsTruncated>${[
                ...objects,
              ]
                .filter(([name]) => name.startsWith(prefix))
                .map(([name, bytes]) => item(name, bytes))
                .join('')}</ListBucketResult>`,
            );
          } else if (request.method === 'PUT') {
            const chunks = [];
            for await (const chunk of request) chunks.push(chunk);
            const bytes = Buffer.concat(chunks);
            objects.set(key, bytes);
            response.setHeader('etag', `"${md5(bytes)}"`);
            response.end();
          } else if (request.method === 'POST' && url.searchParams.has('delete')) {
            const chunks = [];
            for await (const chunk of request) chunks.push(chunk);
            const keys = [
              ...Buffer.concat(chunks)
                .toString()
                .matchAll(/<Key>(.*?)<\/Key>/g),
            ].map((match) => match[1]);
            for (const name of keys) objects.delete(name);
            response.end(
              `<DeleteResult>${keys.map((name) => `<Deleted><Key>${name}</Key></Deleted>`).join('')}</DeleteResult>`,
            );
          } else if (request.method === 'DELETE') {
            objects.delete(key);
            response.end();
          } else {
            response.statusCode = 500;
            response.end(
              `<Error><Code>UnexpectedRequest</Code><Message>${request.method}</Message></Error>`,
            );
          }
        },
        (env) =>
          execute(
            binary,
            [
              'sync',
              `${directory}/`,
              `oss://bucket/${prefix}`,
              '--force',
              '--delete',
              '--addressing-style',
              'path',
              '--retry-times',
              '0',
            ],
            { env },
          ),
      );
      assert.equal(objects.get(target).toString(), 'new signed bytes');
      assert(!objects.has(orphan));
      assert.equal(objects.get(foreign).toString(), 'keep');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);
