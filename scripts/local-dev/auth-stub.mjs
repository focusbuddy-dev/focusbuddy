import http from "node:http";

const port = Number(process.env.PORT ?? "9099");

const sampleUser = {
  sub: "local-dev-user",
  email: "local-dev@example.com",
  name: "Local Dev User",
};

const server = http.createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, mode: "stub" }));
    return;
  }

  if (request.url === "/session") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        mode: "stub",
        user: sampleUser,
        note: "Replace this stub service with Firebase Auth emulator support in issue #30.",
      }),
    );
    return;
  }

  response.writeHead(200, { "content-type": "application/json" });
  response.end(
    JSON.stringify({
      service: "auth",
      mode: "stub",
      availableRoutes: ["/health", "/session"],
      note: "This local auth service is a development stub for issue #51.",
    }),
  );
});

server.listen(port, "0.0.0.0", () => {
  console.log(`[local-dev] auth stub listening on ${port}`);
});