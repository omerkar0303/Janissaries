'use strict';

process.env.NODE_ENV = 'test';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const request = require('supertest');
const { createApp } = require('../src/app');
const { getDb } = require('../src/db');

const app = createApp();

test('health endpoint responds with JSON and no-store', async () => {
  const res = await request(app).get('/api/health').expect(200);
  assert.deepEqual(res.body, { status: 'ok' });
  assert.match(res.headers['cache-control'], /no-store/);
});

test('security headers are set and x-powered-by is hidden', async () => {
  const res = await request(app).get('/api/health');
  const csp = res.headers['content-security-policy'];
  assert.ok(csp, 'CSP header present');
  assert.match(csp, /script-src 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.equal(res.headers['x-frame-options'], 'DENY');
  assert.equal(res.headers['x-powered-by'], undefined);
});

test('unknown API route returns JSON 404 without reflecting input', async () => {
  const res = await request(app).get('/api/<script>alert(1)</script>').expect(404);
  assert.deepEqual(res.body, { error: 'Not found' });
  assert.doesNotMatch(res.text, /<script>/);
});

test('malformed JSON body yields a generic 400, not a stack trace', async () => {
  const res = await request(app)
    .post('/api/health')
    .set('Content-Type', 'application/json')
    .send('{"broken":')
    .expect(400);
  assert.deepEqual(res.body, { error: 'Malformed JSON body' });
});

test('dotfiles and path traversal are not served', async () => {
  await request(app).get('/.env').expect((r) => assert.notEqual(r.status, 200));
  const res = await request(app).get('/..%2f..%2fpackage.json');
  assert.notEqual(res.status, 200);
  assert.doesNotMatch(res.text, /better-sqlite3/);
});

test('schema enforces foreign keys and CHECK constraints', () => {
  const db = getDb();
  assert.equal(db.pragma('foreign_keys', { simple: true }), 1);

  // FK: a project cannot reference a nonexistent owner.
  assert.throws(
    () =>
      db.prepare('INSERT INTO projects (id, owner_id, name) VALUES (?, ?, ?)')
        .run(crypto.randomUUID(), crypto.randomUUID(), 'orphan'),
    /FOREIGN KEY/
  );

  // CHECK: role must be user/admin.
  assert.throws(
    () =>
      db.prepare('INSERT INTO users (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)')
        .run(crypto.randomUUID(), 'mallory', 'm@example.com', 'x', 'superadmin'),
    /CHECK/
  );
});
