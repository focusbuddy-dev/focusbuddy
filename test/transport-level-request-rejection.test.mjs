import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import test from 'node:test';

async function startHeaderLimitedServer(maxHeaderSize = 512) {
  let handlerCallCount = 0;

  const server = createServer({ maxHeaderSize }, (_request, response) => {
    handlerCallCount += 1;
    response.writeHead(200, { 'content-type': 'text/plain' });
    response.end('ok');
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('expected an ephemeral TCP address for the header-limit test server');
  }

  return {
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
    get handlerCallCount() {
      return handlerCallCount;
    },
    url: `http://127.0.0.1:${address.port}`,
  };
}

function sendRequest(targetUrl, cookieHeader) {
  return new Promise((resolve, reject) => {
    const req = request(
      targetUrl,
      {
        headers: {
          cookie: cookieHeader,
        },
        method: 'GET',
      },
      (response) => {
        let body = '';

        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          resolve({ body, statusCode: response.statusCode });
        });
      },
    );

    req.on('error', reject);
    req.end();
  });
}

test('accepts requests whose cookie header stays inside the parser budget', async () => {
  const server = await startHeaderLimitedServer();

  try {
    const response = await sendRequest(server.url, 'session=short-value');

    assert.equal(response.statusCode, 200);
    assert.equal(response.body, 'ok');
    assert.equal(server.handlerCallCount, 1);
  } finally {
    await server.close();
  }
});

test('rejects oversized cookie headers before application code runs', async () => {
  const server = await startHeaderLimitedServer();
  const oversizedCookieHeader = `session=${'x'.repeat(4096)}`;

  try {
    const response = await sendRequest(server.url, oversizedCookieHeader);

    assert.equal(response.statusCode, 431);
    assert.equal(server.handlerCallCount, 0);
    assert.notEqual(response.body, 'ok');
  } finally {
    await server.close();
  }
});
