const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const config = process.env.GOOGLE_CLIENT_ID
  ? {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET
    }
  : (() => {
      const credentials = JSON.parse(
        fs.readFileSync(path.join(__dirname, "youtube-client-secret.json"), "utf8")
      );
      return credentials.web || credentials.installed;
    })();

const oauth2Client = new google.auth.OAuth2(
  config.client_id,
  config.client_secret,
  process.env.GOOGLE_REDIRECT_URI || "http://127.0.0.1:3000/api/youtube/oauth2callback"
);

const TOKEN_PATH = path.join(__dirname, ".youtube-token.json");

function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "select_account consent",
    scope: [
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/youtube.force-ssl"
    ]
  });
}

function loadToken() {
  if (!fs.existsSync(TOKEN_PATH)) return false;
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
  oauth2Client.setCredentials(token);
  return true;
}

function saveToken(tokens) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  oauth2Client.setCredentials(tokens);
}

module.exports = {
  oauth2Client,
  getAuthUrl,
  loadToken,
  saveToken
};
