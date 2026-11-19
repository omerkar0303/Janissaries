'use strict';

/** An error whose message is safe to show to the client. */
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.expose = true;
    if (details) this.details = details;
  }
}

const badRequest = (msg = 'Invalid request', details) => new HttpError(400, msg, details);
const unauthorized = (msg = 'Authentication required') => new HttpError(401, msg);
const forbidden = (msg = 'Forbidden') => new HttpError(403, msg);
const conflict = (msg = 'Conflict') => new HttpError(409, msg);

module.exports = { HttpError, badRequest, unauthorized, forbidden, conflict };
