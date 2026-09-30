const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "dhruvtube.db");

async function main() {
  const SQL = await initSqlJs({
    locateFile: file => require.resolve("sql.js/dist/" + file)
  });

  let db;

  if (fs.existsSync(DB_FILE)) {
    db = new SQL.Database(fs.readFileSync(DB_FILE));
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    try {
      const columns = db.exec("PRAGMA table_info(users)");

      if (columns.length > 0) {
        const names = columns[0].values.map(row => row[1]);

        if (!names.includes("google_id")) {
          db.run("ALTER TABLE users ADD COLUMN google_id TEXT");
        }
      }
    } catch (error) {
      console.error("Google ID migration error:", error);
    }

    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      filename TEXT NOT NULL,
      thumbnail TEXT,
      views INTEGER DEFAULT 0,
      is_short INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS likes (
      user_id INTEGER NOT NULL,
      video_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(user_id, video_id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      video_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      subscriber_id INTEGER NOT NULL,
      channel_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(subscriber_id, channel_id)
    );

    CREATE TABLE IF NOT EXISTS watch_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      video_id INTEGER NOT NULL,
      watched_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      video_id INTEGER,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const data = db.export();

  fs.writeFileSync(DB_FILE, Buffer.from(data));

  db.close();

  console.log("DhruvTube database ready.");
}

main().catch(error => {
  console.error("Database error:", error);
  process.exit(1);
});
