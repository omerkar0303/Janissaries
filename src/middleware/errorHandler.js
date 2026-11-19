'use strict';

const path = require('node:path');
const config = require('../config');

/** JSON 404 for unknown API routes. */
function apiNotFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

/** HTML 404 page for unknown non-API paths (static file, no user input reflected). */
function pageNotFound(req, res) {
  res.status(404).sendFile(path.join(config.publicDir, '404.html'));
}

// Known errors from body-parser / multer mapped to safe client messages.
const KNOWN_ERRORS = {
  'entity.parse.failed': [400, 'Malformed JSON body'],
  'entity.too.large': [413, 'Request body too large'],
  'encoding.unsupported': [415, 'Unsupported content encoding'],
  'charset.unsupported': [415, 'Unsupported charset'],
  LIMIT_FILE_SIZE: [413, 'File too large'],
  LIMIT_FILE_COUNT: [400, 'Too many files'],
  LIMIT_UNEXPECTED_FILE: [400, 'Unexpected file field'],
  LIMIT_PART_COUNT: [400, 'Too many form parts'],
  LIMIT_FIELD_COUNT: [400, 'Too many form fields'],
};

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const known = KNOWN_ERRORS[err.type] || KNOWN_ERRORS[err.code];
  if (known) {
    return res.status(known[0]).json({ error: known[1] });
  }

  if (err.expose && Number.isInteger(err.status) && err.status >= 400 && err.status < 500) {
    const body = { error: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }

  // Unexpected error: log server-side only, never leak internals to the client.
  if (!config.isTest) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  }
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = { errorHandler, apiNotFound, pageNotFound };
