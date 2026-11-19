'use strict';

const config = require('./config');
const { createApp } = require('./app');
const { closeDb } = require('./db');

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`[server] Task Board listening on http://localhost:${config.port} (${config.env})`);
});

// Mitigate slow-client attacks.
server.headersTimeout = 20_000;
server.requestTimeout = 60_000;
server.keepAliveTimeout = 5_000;

function shutdown(signal) {
  console.log(`[server] ${signal} received, shutting down`);
  server.close(() => {
    closeDb();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
