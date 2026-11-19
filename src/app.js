'use strict';

const express = require('express');
const config = require('./config');
const { getDb } = require('./db');
const { securityHeaders, extraHeaders, noStore } = require('./middleware/security');
const { errorHandler, apiNotFound, pageNotFound } = require('./middleware/errorHandler');

function createApp() {
  // Open the DB (and apply schema) at startup so misconfiguration fails fast.
  getDb();

  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', false);
  app.set('query parser', 'simple'); // no nested objects from ?a[b]=c
  app.set('json escape', true); // escape <, >, & in JSON output as < etc.

  app.use(securityHeaders());
  app.use(extraHeaders);

  // ---------- API ----------
  const api = express.Router();
  api.use(noStore);
  api.use(express.json({ limit: '100kb', strict: true, type: 'application/json' }));

  api.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Phase 2+: auth, profile, projects, tasks, comments, attachments, admin routers mount here.

  api.use(apiNotFound);
  app.use('/api', api);

  // ---------- Static frontend ----------
  app.use(
    express.static(config.publicDir, {
      dotfiles: 'deny',
      extensions: ['html'],
      index: 'index.html',
      redirect: false,
      setHeaders(res) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    })
  );

  app.use(pageNotFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
