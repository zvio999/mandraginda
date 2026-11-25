const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js");

const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "mandraginda.db");
const wasmPath = path.join(path.dirname(require.resolve("sql.js")), "sql-wasm.wasm");

let sqlPromise;

function loadSql() {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({ wasmBinary: fs.readFileSync(wasmPath) });
  }
  return sqlPromise;
}

function wrap(raw) {
  function save() {
    const data = Buffer.from(raw.export());
    const tmp = dbPath + ".tmp";
    fs.writeFileSync(tmp, data);
    try {
      fs.renameSync(tmp, dbPath);
    } catch (error) {
      fs.copyFileSync(tmp, dbPath);
      fs.unlinkSync(tmp);
    }
  }

  function statement(sql) {
    return {
      run() {
        const params = Array.prototype.slice.call(arguments);
        const stmt = raw.prepare(sql);
        try {
          if (params.length) stmt.bind(params);
          stmt.step();
        } finally {
          stmt.free();
        }
        save();
      },
      get() {
        const params = Array.prototype.slice.call(arguments);
        const stmt = raw.prepare(sql);
        try {
          if (params.length) stmt.bind(params);
          if (!stmt.step()) return undefined;
          return stmt.getAsObject();
        } finally {
          stmt.free();
        }
      },
      all() {
        const params = Array.prototype.slice.call(arguments);
        const stmt = raw.prepare(sql);
        const rows = [];
        try {
          if (params.length) stmt.bind(params);
          while (stmt.step()) rows.push(stmt.getAsObject());
          return rows;
        } finally {
          stmt.free();
        }
      },
    };
  }

  return {
    exec(sql) {
      raw.exec(sql);
      save();
    },
    prepare(sql) {
      return statement(sql);
    },
    close() {
      save();
      raw.close();
    },
  };
}

async function open() {
  fs.mkdirSync(dataDir, { recursive: true });
  const SQL = await loadSql();
  const raw = fs.existsSync(dbPath) ? new SQL.Database(fs.readFileSync(dbPath)) : new SQL.Database();
  const db = wrap(raw);
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      display_name TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'publish',
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      excerpt TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      published_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'publish'
    );
    CREATE TABLE IF NOT EXISTS cars (
      id INTEGER PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      manufacturer TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      year TEXT NOT NULL DEFAULT '',
      tire_size TEXT NOT NULL DEFAULT '',
      tier_type TEXT NOT NULL DEFAULT '',
      fuel_type TEXT NOT NULL DEFAULT '',
      engine TEXT NOT NULL DEFAULT '',
      axle_lock TEXT NOT NULL DEFAULT '',
      others TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'publish'
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  const memberColumns = db.prepare("PRAGMA table_info(members)").all();
  const names = {};
  memberColumns.forEach((column) => {
    names[column.name] = true;
  });
  if (!names.password_hash) db.exec("ALTER TABLE members ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''");
  if (!names.salt) db.exec("ALTER TABLE members ADD COLUMN salt TEXT NOT NULL DEFAULT ''");
  return db;
}

module.exports = { open, dbPath };
