import http from 'node:http';

function parsePort(rawPort) {
  const normalizedPort = rawPort ?? '9099';

  if (!/^\d+$/.test(normalizedPort)) {
    throw new Error(
      `[local-dev] Invalid PORT value "${normalizedPort}". PORT must be an integer between 0 and 65535.`,
    );
  }

  const parsedPort = Number.parseInt(normalizedPort, 10);

  if (!Number.isInteger(parsedPort) || parsedPort < 0 || parsedPort > 65535) {
    throw new Error(
      `[local-dev] Invalid PORT value "${normalizedPort}". PORT must be an integer between 0 and 65535.`,
    );
  }

  return parsedPort;
}

const authMode = process.env.FOCUSBUDDY_AUTH_MODE ?? 'stub';

if (authMode !== 'stub') {
  throw new Error(
    `[local-dev] Unsupported FOCUSBUDDY_AUTH_MODE "${authMode}". The auth stub only supports "stub" mode.`,
  );
}

const port = parsePort(process.env.PORT);

const sampleUser = {
  sub: 'local-dev-user',
  email: 'local-dev@example.com',
  name: 'Local Dev User',
};

const server = http.createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, {'content-type': 'application/json'});
    response.end(JSON.stringify({ok: true, mode: authMode}));
    return;
  }

  if (request.url === '/session') {
    response.writeHead(200, {'content-type': 'application/json'});
    response.end(
      JSON.stringify({
        mode: authMode,
        user: sampleUser,
        note: 'Replace this stub service with Firebase Auth emulator support in issue #30.',
      }),
    );
    return;
  }

  response.writeHead(200, {'content-type': 'application/json'});
  response.end(
    JSON.stringify({
      service: 'auth',
      mode: authMode,
      availableRoutes: ['/health', '/session'],
      note: 'This local auth service is a development stub for issue #51.',
    }),
  );
});

server.listen(port, '0.0.0.0', () => {
  console.log(`[local-dev] auth stub listening on ${port}`);
});
