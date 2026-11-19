'use strict';

const path = require('node:path');
const crypto = require('node:crypto');

const ROOT_DIR = path.resolve(__dirname, '..');

// Tests configure everything through process.env; never let a developer's .env leak into them.
if (process.env.NODE_ENV !== 'test') {
  require('dotenv').config({ path: path.join(ROOT_DIR, '.env'), quiet: true });
}

const PLACEHOLDER_SECRETS = new Set(['change-me-to-a-long-random-string', 'changeme', 'secret']);

function fail(message) {
  // Fail fast at boot: running with an insecure config is worse than not running.
  throw new Error(`[config] ${message}`);
}

function intFromEnv(name, fallback, min, max) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  if (!/^\d+$/.test(raw)) fail(`${name} must be an integer`);
  const value = Number(raw);
  if (value < min || value > max) fail(`${name} must be between ${min} and ${max}`);
  return value;
}

function resolvePath(p) {
  if (p === ':memory:') return p;
  return path.isAbsolute(p) ? p : path.join(ROOT_DIR, p);
}

function loadConfig() {
  const env = process.env.NODE_ENV || 'development';
  if (!['development', 'production', 'test'].includes(env)) {
    fail('NODE_ENV must be development, production, or test');
  }

  let sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && env === 'test') {
    sessionSecret = crypto.randomBytes(48).toString('hex');
  }
  if (!sessionSecret) fail('SESSION_SECRET is required (see .env.example)');
  if (sessionSecret.length < 32) fail('SESSION_SECRET must be at least 32 characters');
  if (PLACEHOLDER_SECRETS.has(sessionSecret)) fail('SESSION_SECRET is still the placeholder value');

  const uploadDir = resolvePath(process.env.UPLOAD_DIR || 'storage/uploads');
  const publicDir = path.join(ROOT_DIR, 'public');
  const rel = path.relative(publicDir, uploadDir);
  if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
    fail('UPLOAD_DIR must not be inside public/');
  }

  return Object.freeze({
    env,
    isProduction: env === 'production',
    isTest: env === 'test',
    port: intFromEnv('PORT', 3000, 1, 65535),
    sessionSecret,
    sessionTtlMs: intFromEnv('SESSION_TTL_HOURS', 8, 1, 24 * 7) * 60 * 60 * 1000,
    bcryptRounds: intFromEnv('BCRYPT_ROUNDS', env === 'test' ? 4 : 12, 4, 15),
    dbPath: resolvePath(process.env.DB_PATH || (env === 'test' ? ':memory:' : 'data/app.db')),
    uploadDir,
    publicDir,
    maxUploadBytes: intFromEnv('MAX_UPLOAD_BYTES', 5 * 1024 * 1024, 1024, 20 * 1024 * 1024),
    rootDir: ROOT_DIR,
  });
}

module.exports = loadConfig();
