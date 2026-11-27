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
    CREATE TABLE IF NOT EXISTS member_cars (
      id INTEGER PRIMARY KEY,
      member_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      manufacturer TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      year TEXT NOT NULL DEFAULT '',
      engine TEXT NOT NULL DEFAULT '',
      fuel_type TEXT NOT NULL DEFAULT '',
      tire_size TEXT NOT NULL DEFAULT '',
      tier_type TEXT NOT NULL DEFAULT '',
      axle_lock TEXT NOT NULL DEFAULT '',
      others TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      gearbox TEXT NOT NULL DEFAULT '',
      drive TEXT NOT NULL DEFAULT '',
      doors TEXT NOT NULL DEFAULT '',
      winch TEXT NOT NULL DEFAULT '',
      portal_axle TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS member_cars_member ON member_cars (member_id);
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
  const carColumns = db.prepare("PRAGMA table_info(member_cars)").all();
  const carNames = {};
  carColumns.forEach(function (column) { carNames[column.name] = true; });
  ["category", "gearbox", "drive", "doors", "winch", "portal_axle", "model_status", "model_path"].forEach(function (column) {
    if (!carNames[column]) db.exec("ALTER TABLE member_cars ADD COLUMN " + column + " TEXT NOT NULL DEFAULT ''");
  });
  db.exec("CREATE TABLE IF NOT EXISTS member_sessions (id TEXT PRIMARY KEY, member_id INTEGER NOT NULL, expires_at INTEGER NOT NULL)");
  db.exec("CREATE TABLE IF NOT EXISTS member_car_photos (id INTEGER PRIMARY KEY, car_id INTEGER NOT NULL, member_id INTEGER NOT NULL, path TEXT NOT NULL, is_wall_poster INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL)");
  db.exec("CREATE INDEX IF NOT EXISTS member_car_photos_car ON member_car_photos (car_id)");
  db.exec("CREATE TABLE IF NOT EXISTS garage_parts (id INTEGER PRIMARY KEY, car_id INTEGER NOT NULL, member_id INTEGER NOT NULL, slot TEXT NOT NULL, part_key TEXT NOT NULL, created_at TEXT NOT NULL)");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS garage_parts_slot ON garage_parts (car_id, slot)");
  return db;
}

module.exports = { open, dbPath };
