const express = require("express");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const initSqlJs = require("sql.js");
const {
  oauth2Client,
  getAuthUrl,
  saveToken
} = require("./youtube-auth");

const router = express.Router();

router.get("/youtube/connect", (req, res) => {
  res.redirect(getAuthUrl());
});

router.get("/youtube/oauth2callback", async (req, res) => {
  try {
    const code = req.query.code;

    if (!code) {
      return res.status(400).send("Authorization code missing.");
    }

    const { tokens } = await oauth2Client.getToken(code);
    saveToken(tokens);

    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      version: "v2",
      auth: oauth2Client
    });

    const googleProfile = await oauth2.userinfo.get();

    const googleId = String(googleProfile.data.id || "");
    const email = String(googleProfile.data.email || "").trim().toLowerCase();
    const googleName =
      String(
        googleProfile.data.name ||
        (email ? email.split("@")[0] : "GoogleUser")
      ).trim();

    if (!googleId || !email) {
      throw new Error("Google account information unavailable.");
    }

    const DB_FILE = path.join(__dirname, "dhruvtube.db");

    const SQL = await initSqlJs({
      locateFile: file => require.resolve("sql.js/dist/" + file)
    });

    if (!fs.existsSync(DB_FILE)) {
      throw new Error("DhruvTube database not found.");
    }

    const db = new SQL.Database(fs.readFileSync(DB_FILE));

    const columns = db.exec("PRAGMA table_info(users)");

    if (columns.length > 0) {
      const names = columns[0].values.map(row => row[1]);

      if (!names.includes("google_id")) {
        db.run("ALTER TABLE users ADD COLUMN google_id TEXT");
      }
    }

    let result = db.exec(
      "SELECT id, username, email, avatar, created_at FROM users WHERE google_id = ? LIMIT 1",
      [googleId]
    );

    let user;

    if (result.length > 0 && result[0].values.length > 0) {
      const row = result[0].values[0];

      db.run(
        "UPDATE users SET avatar = ?, email = ? WHERE id = ?",
        [googleProfile.data.picture || "", email, row[0]]
      );

      user = {
        id: row[0],
        username: row[1],
        email: email,
        avatar: googleProfile.data.picture || row[3] || "",
        created_at: row[4]
      };
    } else {
      result = db.exec(
        "SELECT id, username, email, avatar, created_at FROM users WHERE email = ? LIMIT 1",
        [email]
      );

      if (result.length > 0 && result[0].values.length > 0) {
        const row = result[0].values[0];

        db.run(
          "UPDATE users SET google_id = ?, avatar = ?, email = ? WHERE id = ?",
          [googleId, googleProfile.data.picture || "", email, row[0]]
        );

        user = {
          id: row[0],
          username: row[1],
          email: email,
          avatar: googleProfile.data.picture || "",
          created_at: row[4]
        };
      } else {
        let username =
          googleName
            .replace(/[^a-zA-Z0-9_]/g, "")
            .slice(0, 24) || "GoogleUser";

        let baseUsername = username;
        let counter = 1;

        while (true) {
          const exists = db.exec(
            "SELECT id FROM users WHERE username = ? LIMIT 1",
            [username]
          );

          if (exists.length === 0 || exists[0].values.length === 0) {
            break;
          }

          username = baseUsername + counter++;
        }

        const passwordHash = await bcrypt.hash(
          require("crypto").randomBytes(32).toString("hex"),
          10
        );

        db.run(
          `INSERT INTO users
           (username, email, password_hash, avatar, google_id)
           VALUES (?, ?, ?, ?, ?)`,
          [
            username,
            email,
            passwordHash,
            googleProfile.data.picture || "",
            googleId
          ]
        );

        result = db.exec(
          "SELECT id, username, email, avatar, created_at FROM users WHERE google_id = ? LIMIT 1",
          [googleId]
        );

        const row = result[0].values[0];

        user = {
          id: row[0],
          username: row[1],
          email: row[2],
          avatar: row[3],
          created_at: row[4]
        };
      }
    }

    fs.writeFileSync(DB_FILE, Buffer.from(db.export()));
    db.close();

    res.redirect(
      "/?google_login=success&user=" +
      encodeURIComponent(Buffer.from(JSON.stringify(user)).toString("base64url"))
    );
  } catch (error) {
    console.error("YouTube OAuth error:", error);
    res.status(500).send("YouTube connection failed.");
  }
});

router.post("/youtube/disconnect", (req, res) => {
  try {
    const fs = require("fs");
    const path = require("path");

    const tokenPath = path.join(__dirname, ".youtube-token.json");

    if (fs.existsSync(tokenPath)) {
      fs.unlinkSync(tokenPath);
    }

    oauth2Client.setCredentials({});

    res.json({
      success: true,
      connected: false
    });
  } catch (error) {
    console.error("YouTube disconnect error:", error);
    res.status(500).json({
      success: false,
      message: "YouTube logout failed."
    });
  }
});

router.get("/youtube/status", async (req, res) => {
  try {
    const loaded = require("./youtube-auth").loadToken();

    if (!loaded) {
      return res.json({
        connected: false
      });
    }

    const youtube = google.youtube({
      version: "v3",
      auth: oauth2Client
    });

    const response = await youtube.channels.list({
      part: "snippet",
      mine: true
    });

    const channel = response.data.items?.[0];

    res.json({
      connected: true,
      channel: channel
        ? {
            id: channel.id,
            title: channel.snippet?.title || ""
          }
        : null
    });
  } catch (error) {
    console.error("YouTube status error:", error);
    res.json({
      connected: false
    });
  }
});

module.exports = router;
