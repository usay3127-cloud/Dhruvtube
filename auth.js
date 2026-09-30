const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const initSqlJs = require("sql.js");

const router = express.Router();

const DB_FILE = path.join(__dirname, "dhruvtube.db");

async function openDatabase() {
  const SQL = await initSqlJs({
    locateFile: file => require.resolve("sql.js/dist/" + file)
  });

  if (fs.existsSync(DB_FILE)) {
    return new SQL.Database(fs.readFileSync(DB_FILE));
  }

  return new SQL.Database();
}

function saveDatabase(db) {
  const data = db.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}


// ===============================
// REGISTER
// ===============================

router.post("/auth/register", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Username, email and password are required."
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Username must be at least 3 characters."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters."
      });
    }

    const db = await openDatabase();

    const existing = db.exec(
      "SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1",
      [username, email]
    );

    if (existing.length > 0 && existing[0].values.length > 0) {
      db.close();

      return res.status(409).json({
        success: false,
        message: "Username or email already exists."
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    db.run(
      `INSERT INTO users
       (username, email, password_hash)
       VALUES (?, ?, ?)`,
      [username, email, passwordHash]
    );

    const result = db.exec(
      "SELECT id, username, email, avatar, created_at FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    const user = {
      id: result[0].values[0][0],
      username: result[0].values[0][1],
      email: result[0].values[0][2],
      avatar: result[0].values[0][3],
      created_at: result[0].values[0][4]
    };

    saveDatabase(db);
    db.close();

    res.status(201).json({
      success: true,
      message: "Account created successfully.",
      user
    });

  } catch (error) {
    console.error("Register API error:", error);

    res.status(500).json({
      success: false,
      message: "Could not create account.",
      error: error.message
    });
  }
});


// ===============================
// LOGIN
// ===============================

router.post("/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    const db = await openDatabase();

    const result = db.exec(
      `SELECT
        id,
        username,
        email,
        password_hash,
        avatar,
        created_at
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      db.close();

      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const row = result[0].values[0];

    const passwordMatch = await bcrypt.compare(
      password,
      row[3]
    );

    if (!passwordMatch) {
      db.close();

      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const user = {
      id: row[0],
      username: row[1],
      email: row[2],
      avatar: row[4],
      created_at: row[5]
    };

    db.close();

    res.json({
      success: true,
      message: "Login successful.",
      user
    });

  } catch (error) {
    console.error("Login API error:", error);

    res.status(500).json({
      success: false,
      message: "Could not login.",
      error: error.message
    });
  }
});


// ===============================
// GET CURRENT USER
// ===============================

router.get("/auth/user/:id", async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID."
      });
    }

    const db = await openDatabase();

    const result = db.exec(
      `SELECT
        id,
        username,
        email,
        avatar,
        created_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      db.close();

      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    const row = result[0].values[0];

    const user = {
      id: row[0],
      username: row[1],
      email: row[2],
      avatar: row[3],
      created_at: row[4]
    };

    db.close();

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error("User API error:", error);

    res.status(500).json({
      success: false,
      message: "Could not load user.",
      error: error.message
    });
  }
});


module.exports = router;
