'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const config = require('../config');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

function openDatabase(dbPath = config.dbPath) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);

  db.pragma('foreign_keys = ON');
  if (dbPath !== ':memory:') db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  // Prevent ATTACH / load_extension style abuse even if a query were ever compromised.
  db.pragma('trusted_schema = OFF');

  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));

  if (db.pragma('foreign_keys', { simple: true }) !== 1) {
    throw new Error('[db] foreign key enforcement could not be enabled');
  }
  return db;
}

let instance = null;

/** Shared connection for the running app. */
function getDb() {
  if (!instance) instance = openDatabase();
  return instance;
}

function closeDb() {
  if (instance) {
    instance.close();
    instance = null;
  }
}

module.exports = { getDb, closeDb, openDatabase };
