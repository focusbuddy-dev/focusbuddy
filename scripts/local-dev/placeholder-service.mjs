import http from 'node:http';

const serviceName = process.argv[2] ?? 'service';
const portValue = process.env.PORT ?? process.argv[3] ?? '3000';
const port = Number(portValue);

if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error(
    `[local-dev] Invalid port "${portValue}". Expected an integer between 0 and 65535.`,
  );
  process.exit(1);
}

const visibleEnv = {
  FOCUSBUDDY_API_BASE_URL: process.env.FOCUSBUDDY_API_BASE_URL ?? null,
  FOCUSBUDDY_AUTH_BASE_URL: process.env.FOCUSBUDDY_AUTH_BASE_URL ?? null,
  FOCUSBUDDY_AUTH_MODE: process.env.FOCUSBUDDY_AUTH_MODE ?? null,
  DATABASE_URL: process.env.DATABASE_URL ? 'configured' : null,
};

const server = http.createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, {'content-type': 'application/json'});
    response.end(JSON.stringify({ok: true, service: serviceName}));
    return;
  }

  response.writeHead(200, {'content-type': 'application/json'});
  response.end(
    JSON.stringify({
      service: serviceName,
      mode: 'placeholder',
      message: `Placeholder ${serviceName} container for Issue #51 local development wiring`,
      env: visibleEnv,
    }),
  );
});

server.listen(port, '0.0.0.0', () => {
  console.log(`[local-dev] ${serviceName} placeholder listening on ${port}`);
});
